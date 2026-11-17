import type { LightMyRequestResponse } from 'fastify'
import { buildApp, type BuildAppOptions } from '../../src/app'
import { prisma } from '../../src/database/client'
import { authService } from '../../src/services/auth.service'
import { assertIsTestDatabase } from './test-database'

export async function createTestApp(options?: BuildAppOptions) {
  const app = await buildApp(options)
  await app.ready()
  return app
}

/** Esvazia as tabelas. Recusa agir se a conexão não for com um banco de teste. */
export async function resetDatabase() {
  assertIsTestDatabase(process.env.DATABASE_URL ?? '')
  await prisma.userHealthProfile.deleteMany()
  await prisma.user.deleteMany()
}

export function jsonOf<T = Record<string, unknown>>(response: LightMyRequestResponse): T {
  return JSON.parse(response.body) as T
}

/** Captura as linhas de log escritas pelo Fastify. */
export function createLogCapture() {
  const lines: string[] = []
  return {
    stream: { write: (message: string) => void lines.push(message) },
    text: () => lines.join('\n')
  }
}

/** Cria um usuário direto no banco (sem passar pela API), com a senha em hash bcrypt de verdade. */
export async function createUser(overrides: { email?: string; name?: string; password?: string; passwordHash?: string } = {}) {
  const password = overrides.password ?? 'Senha1234'
  return prisma.user.create({
    data: {
      email: overrides.email ?? 'maria@example.com',
      name: overrides.name ?? 'Maria da Silva',
      password_hash: overrides.passwordHash ?? (await authService.hashPassword(password))
    }
  })
}
