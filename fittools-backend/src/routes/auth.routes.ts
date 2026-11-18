import { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../database/client'
import { loginRateLimit, registerRateLimit } from '../middlewares/rateLimit'
import { loginSchema, registerSchema } from '../schemas/auth.schema'
import { DUMMY_PASSWORD_HASH, authService } from '../services/auth.service'
import { ConflictError, UnauthorizedError } from '../utils/errors.util'
import { signJWT } from '../utils/jwt.util'
import { parseOrThrow } from '../utils/validation.util'

const EMAIL_TAKEN = 'Email já cadastrado'
// Mesma mensagem para email inexistente e senha errada (evita descobrir quais emails têm conta)
const INVALID_CREDENTIALS = 'Credenciais inválidas'

/** Campos do usuário que a API devolve. O hash da senha nunca sai do banco (`select`). */
const PUBLIC_USER_FIELDS = { id: true, email: true, name: true, created_at: true } as const

function isEmailTakenError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }
  const target = error.meta?.target
  return Array.isArray(target) ? target.includes('email') : String(target ?? '').includes('email')
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', { config: { rateLimit: registerRateLimit } }, async (request, reply) => {
    const { email, password, name } = parseOrThrow(registerSchema, request.body)

    // Checagem barata antes do bcrypt (~300 ms de CPU): repetir um email já cadastrado não
    // deve gastar tempo de hash. A constraint única continua sendo a garantia final (abaixo).
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      throw new ConflictError(EMAIL_TAKEN)
    }

    const passwordHash = await authService.hashPassword(password)

    let user
    try {
      user = await prisma.user.create({
        data: { email, name, password_hash: passwordHash },
        select: PUBLIC_USER_FIELDS
      })
    } catch (error) {
      // Dois cadastros simultâneos com o mesmo email passam pela checagem acima; o banco decide
      if (isEmailTakenError(error)) {
        throw new ConflictError(EMAIL_TAKEN)
      }
      throw error
    }

    const token = signJWT(user.id, user.email)

    // A resposta carrega um token: não pode ficar em cache de navegador ou de proxy
    reply.header('Cache-Control', 'no-store')
    return reply.status(201).send({ user, token })
  })

  app.post('/login', { config: { rateLimit: loginRateLimit } }, async (request, reply) => {
    const { email, password } = parseOrThrow(loginSchema, request.body)

    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_USER_FIELDS, password_hash: true }
    })

    // Sempre faz UMA verificação bcrypt, mesmo sem usuário, para o tempo de resposta não
    // distinguir "email não existe" de "senha errada"
    const passwordOk = await authService.verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH)
    if (!user || !passwordOk) {
      throw new UnauthorizedError(INVALID_CREDENTIALS)
    }

    const token = signJWT(user.id, user.email)

    reply.header('Cache-Control', 'no-store')
    return reply.status(200).send({
      user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
      token
    })
  })
}