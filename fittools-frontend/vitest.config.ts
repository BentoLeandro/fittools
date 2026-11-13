import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      // Fórmulas científicas (Task 7.2): cobertura mínima de 90% (Requisito 13.1).
      include: ['composables/useScience.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
})