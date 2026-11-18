import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './config/env'
import { getTrustProxy } from './config/proxy'
import { registerErrorHandlers } from './middlewares/error-handler'
import { registerRateLimitPlugin } from './middlewares/rateLimit'
import { authRoutes } from './routes/auth.routes'
import { healthRoutes } from './routes/health.routes'
import { userRoutes } from './routes/user.routes'

export interface BuildAppOptions {
  /** Só para testes: captura os logs num stream para conferir que nada sensível é gravado. */
  logStream?: { write(message: string): void }
}

export async function buildApp(options: BuildAppOptions = {}) {
  const isDev = env.NODE_ENV === 'development'

  const app = Fastify({
    // Em producao a API fica atras do Caddy e a porta 3001 nao e publicada, entao so ali
    // podemos confiar no X-Forwarded-For (IP real do visitante). Em desenvolvimento a API
    // esta exposta direto: confiar no header permitiria forjar o IP do rate limiting.
    trustProxy: getTrustProxy(env.NODE_ENV),
    logger: {
      level: options.logStream ? 'info' : env.NODE_ENV === 'test' ? 'silent' : isDev ? 'debug' : 'info',
      // Garante que credenciais nunca apareçam nos logs
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
        censor: '[REDACTED]'
      },
      stream: options.logStream,
      transport:
        isDev && !options.logStream
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined
    }
  })

  // Declara request.user de antemão (formato estável); só o jwtMiddleware o preenche
  app.decorateRequest('user', null)

  // O plugin vem antes dos handlers de erro (o 404 usa o limitador) e das rotas (o hook onRoute
  // só enxerga as rotas registradas depois dele)
  await registerRateLimitPlugin(app)
  registerErrorHandlers(app)

  await app.register(helmet)

  await app.register(cors, {
    origin: (origin, callback) => {
      // Sem header Origin (curl, health checks) ou origem na whitelist
      callback(null, !origin || env.CORS_ORIGIN.includes(origin))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Sem isto o navegador não deixa o frontend ler o tempo de espera de um 429
    exposedHeaders: ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  })

  await app.register(healthRoutes)
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(userRoutes, { prefix: '/api/v1/users' })

  return app
}
