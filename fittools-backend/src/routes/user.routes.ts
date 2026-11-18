import type { FastifyInstance } from 'fastify'
import { requireUser } from '../middlewares/jwt.middleware'
import { healthProfileReplaceSchema } from '../schemas/user.schema'
import { userService } from '../services/user.service'
import { NotFoundError } from '../utils/errors.util'
import { parseOrThrow } from '../utils/validation.util'

export async function userRoutes(app: FastifyInstance) {
  // Rotas autenticadas: exigem o JWT e têm limite por usuário. Em onRequest, para recusar sem
  // token ANTES de ler o corpo; rateLimit: false desliga o limite público por IP.
  const authenticated = { config: { rateLimit: false as const }, onRequest: [...app.authenticated] }

  app.get('/me', authenticated, async (request, reply) => {
    // O dono dos dados vem SEMPRE do token verificado, nunca de parâmetro, URL ou corpo
    const { id } = requireUser(request)

    const me = await userService.getMe(id)
    if (!me) {
      // Token ainda válido, mas o usuário foi apagado
      throw new NotFoundError()
    }

    // Dados pessoais: não podem ficar em cache de navegador ou de proxy
    reply.header('Cache-Control', 'no-store')
    return me
  })

  // Substitui o perfil inteiro (Requisito 5.6): o que não vier no corpo é apagado
  app.put('/me/profile', authenticated, async (request, reply) => {
    const { id } = requireUser(request)
    const input = parseOrThrow(healthProfileReplaceSchema, request.body)

    const profile = await userService.replaceHealthProfile(id, input)
    if (!profile) {
      // Token ainda válido, mas o usuário foi apagado
      throw new NotFoundError()
    }

    reply.header('Cache-Control', 'no-store')
    return { health_profile: profile }
  })
}