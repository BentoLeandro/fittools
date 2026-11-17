import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { assertIsTestDatabase, getTestDatabaseUrl } from './test-database'

/** Antes da suíte: aplica as migrations (as mesmas do deploy) no banco de TESTE. Idempotente. */
export default function setup() {
  const url = getTestDatabaseUrl()
  assertIsTestDatabase(url)

  const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js')
  try {
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe'
    })
  } catch (error) {
    const output = (error as { stdout?: Buffer; stderr?: Buffer })
    const details = `${output.stdout ?? ''}${output.stderr ?? ''}`.trim()
    throw new Error(
      `Não foi possível aplicar as migrations no banco de teste. O PostgreSQL do Docker está no ar ` +
        `(docker compose -f docker-compose.dev.yml up -d)?\n${details}`
    )
  }
}