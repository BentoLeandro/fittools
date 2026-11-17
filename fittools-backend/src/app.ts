import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './config/env'
import { registerErrorHandlers } from './middlewares/error-handler'
import { authRoutes } from './routes/auth.routes'
import { healthRoutes } from './routes/health.routes'

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
    trustProxy: env.NODE_ENV === 'production',
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

  registerErrorHandlers(app)

  await app.register(helmet)

  await app.register(cors, {
    origin: (origin, callback) => {
      // Sem header Origin (curl, health checks) ou origem na whitelist
      callback(null, !origin || env.CORS_ORIGIN.includes(origin))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })

  await app.register(healthRoutes)
  await app.register(authRoutes, { prefix: '/api/v1/auth' })

  return app
}
