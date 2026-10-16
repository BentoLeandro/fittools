import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#00E676',
        'brand-dark': '#00b85e',
        'site-bg': '#0B0F19',
        'card-bg': '#151B2B',
      }
    }
  },
  plugins: []
} satisfies Config
