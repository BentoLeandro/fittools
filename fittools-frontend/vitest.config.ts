import { defineConfig } from 'vitest/config'

// Configuracao minima dos testes unitarios. A Task 7.2 amplia (cobertura etc.).
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output']
  }
})