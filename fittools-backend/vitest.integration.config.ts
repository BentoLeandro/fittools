import { defineConfig } from 'vitest/config'
import { getTestDatabaseUrl } from './tests/integration/test-database'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    // Todos os arquivos compartilham o mesmo banco de teste: rodar um de cada vez
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      // O Prisma Client e o src/config/env.ts leem DATABASE_URL: aqui ela aponta para o banco de TESTE
      DATABASE_URL: getTestDatabaseUrl(),
      JWT_SECRET: 'segredo-somente-para-testes-com-mais-de-32-caracteres',
      JWT_EXPIRATION_DAYS: '7',
      CORS_ORIGIN: 'http://localhost:3000'
    }
  }
})