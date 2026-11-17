import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // bcrypt com cost 12 leva cerca de 300 ms por operação; folga para máquinas lentas e CI
    testTimeout: 15000,
    // Valores fixos só para os testes: o src/config/env.ts valida estas variáveis ao ser importado,
    // e o `.env` de desenvolvimento nunca deve influenciar o resultado dos testes.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/fittools_unit_test',
      JWT_SECRET: 'segredo-somente-para-testes-com-mais-de-32-caracteres',
      JWT_EXPIRATION_DAYS: '7',
      CORS_ORIGIN: 'http://localhost:3000'
    }
  }
})