import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'dotenv'

// Credenciais de desenvolvimento do docker-compose.dev.yml (somente uso local)
const DEFAULT_TEST_DATABASE_URL = 'postgresql://fittools:fittools_dev@localhost:5432/fittools_test'

/**
 * Trava de segurança: os testes de integração APAGAM dados. Só rodam em um banco cujo nome
 * contém "test", para nunca esvaziar o banco de desenvolvimento (`fittools`) por engano.
 */
export function assertIsTestDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, '')
  if (!/test/i.test(name)) {
    throw new Error(`Recusando rodar testes de integração no banco "${name}": o nome precisa conter "test".`)
  }
}

/** TEST_DATABASE_URL do ambiente, senão do `.env` do backend, senão o banco de teste local. */
export function getTestDatabaseUrl(): string {
  let url = process.env.TEST_DATABASE_URL
  const envFile = resolve(process.cwd(), '.env')
  if (!url && existsSync(envFile)) {
    url = parse(readFileSync(envFile)).TEST_DATABASE_URL
  }
  url ||= DEFAULT_TEST_DATABASE_URL
  assertIsTestDatabase(url)
  return url
}