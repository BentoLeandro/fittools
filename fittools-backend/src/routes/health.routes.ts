import type { FastifyInstance } from 'fastify'
import { prisma } from '../database/client'

const DB_TIMEOUT_MS = 5000

async function isDatabaseUp(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS)
      })
    ])
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const dbUp = await isDatabaseUp()
    return reply.status(dbUp ? 200 : 503).send({
      status: dbUp ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbUp ? 'connected' : 'disconnected'
    })
  })
}
