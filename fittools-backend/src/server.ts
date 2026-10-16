import { buildApp } from './app'
import { env } from './config/env'
import { prisma } from './database/client'

async function start() {
  const app = await buildApp()

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} recebido, encerrando servidor...`)
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void start()
