import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthenticatedUser } from '../types'
import { UnauthorizedError } from '../utils/errors.util'
import { JwtError, JwtExpiredError, verifyJWT } from '../utils/jwt.util'

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido pelo `jwtMiddleware`; `null` em rotas públicas ou sem autenticação. */
    user: AuthenticatedUser | null
  }
}

const MESSAGES = {
  missing: 'Token de autenticação não fornecido',
  malformed: 'Formato de token inválido'
} as const

export type BearerResult = { ok: true; token: string } | { ok: false; reason: 'missing' | 'malformed' }

/**
 * Extrai o token de `Authorization: Bearer <token>`. O nome do esquema não diferencia
 * maiúsculas (RFC 7235); o token tem de ser UM trecho sem espaços ("Bearer a b" é recusado).
 */
export function extractBearerToken(header: string | undefined): BearerResult {
  if (header === undefined || header === '') {
    return { ok: false, reason: 'missing' }
  }
  const match = /^Bearer +(\S+)$/i.exec(header)
  return match ? { ok: true, token: match[1] } : { ok: false, reason: 'malformed' }
}

type Reason = 'missing' | 'malformed' | 'expired' | 'invalid'

function reject(request: FastifyRequest, reply: FastifyReply, reason: Reason, message: string): never {
  // Registra só o motivo, nunca o token. Token adulterado ou com formato estranho pode ser
  // tentativa de ataque (warn); ausente ou expirado é rotina.
  const level = reason === 'invalid' || reason === 'malformed' ? 'warn' : 'info'
  request.log[level]({ authFailure: reason }, 'Autenticação recusada')
  reply.header('WWW-Authenticate', 'Bearer')
  throw new UnauthorizedError(message)
}

/**
 * Exige um JWT válido e preenche `request.user` com `{ id, email }`.
 * Responde 401 com mensagens distintas para token ausente, formato inválido, expirado e inválido.
 *
 * Uso: `{ onRequest: jwtMiddleware }` (recomendado: recusa antes de ler o corpo da requisição)
 * ou `{ preHandler: jwtMiddleware }`. Não consulta o banco: o token vale até expirar (JWT sem estado).
 */
export async function jwtMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const bearer = extractBearerToken(request.headers.authorization)
  if (!bearer.ok) {
    reject(request, reply, bearer.reason, MESSAGES[bearer.reason])
  }

  try {
    const payload = verifyJWT(bearer.token)
    request.user = { id: payload.user_id, email: payload.email }
  } catch (error) {
    if (error instanceof JwtError) {
      reject(request, reply, error instanceof JwtExpiredError ? 'expired' : 'invalid', error.message)
    }
    // Qualquer outra falha é um bug nosso: vira 500 genérico
    throw error
  }
}

/**
 * Devolve o usuário autenticado da requisição. Se a rota esqueceu de usar o `jwtMiddleware`,
 * responde 401 em vez de seguir sem dono (a falha fecha, não abre).
 * Todo endpoint autenticado deve usar o `id` DAQUI (nunca de parâmetro ou corpo) para
 * garantir que cada usuário só acessa os próprios dados (Requisitos 4.10 e 4.11).
 */
export function requireUser(request: FastifyRequest): AuthenticatedUser {
  if (!request.user) {
    throw new UnauthorizedError(MESSAGES.missing)
  }
  return request.user
}