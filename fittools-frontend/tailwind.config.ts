import type { Config } from 'tailwindcss'

// Paleta e medidas herdadas do site antigo (assets/css/styles.css).
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './utils/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        brand: '#00E676',
        'brand-dark': '#00B85E',
        'on-brand': '#07130C',
        'site-bg': '#0B0F19',
        'card-bg': '#151B2B',
        'footer-bg': '#080C14',
        line: '#212B42',
        'line-2': '#2D3A57',
        ink: '#E6EDF7',
        muted: '#94A3B8',
        info: '#38BDF8',
        gold: '#FFD166',
        danger: '#FF5A5F',
        accent: '#A78BFA'
      },
      keyframes: {
        'result-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' }
        }
      },
      animation: {
        'result-in': 'result-in 0.35s ease both'
      },
      maxWidth: {
        site: '1120px'
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Arial',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
} satisfies Config