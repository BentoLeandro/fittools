import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './config/env'
import { healthRoutes } from './routes/health.routes'

export async function buildApp() {
  const isDev = env.NODE_ENV === 'development'

  const app = Fastify({
    // Em producao a API fica atras do Caddy e a porta 3001 nao e publicada, entao so ali
    // podemos confiar no X-Forwarded-For (IP real do visitante). Em desenvolvimento a API
    // esta exposta direto: confiar no header permitiria forjar o IP do rate limiting.
    trustProxy: env.NODE_ENV === 'production',
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : isDev ? 'debug' : 'info',
      // Garante que credenciais nunca apareçam nos logs
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
        censor: '[REDACTED]'
      },
      transport: isDev
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined
    }
  })

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

  return app
}
