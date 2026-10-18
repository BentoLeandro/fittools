import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CALCULATORS, LEGAL_LINKS } from './utils/site'

// Rotas das calculadoras (fonte unica: utils/site.ts). As URLs devem ser identicas as do
// site antigo (Requisitos 2.10 e 14.2); por isso a hidratacao e /calculadora-de-agua.
const CALCULATOR_ROUTES = CALCULATORS.map((calculator) => calculator.path)

// Paginas privadas ou de autenticacao: fora do sitemap e bloqueadas no robots.txt.
// '/dev-preview-calculadora' e uma pagina TEMPORARIA de pre-visualizacao do layout; remover
// junto com o arquivo pages/dev-preview-calculadora.vue quando a primeira calculadora existir.
const PRIVATE_ROUTES = ['/login', '/registro', '/perfil', '/dev-preview-calculadora']

// O menu e o rodape ja linkam para paginas que serao criadas nas proximas fases. Para o
// pre-render nao tratar esses links como erro (e sem esconder erros reais), ele ignora so as
// rotas CONHECIDAS que ainda nao tem arquivo em pages/. Quando o arquivo aparece, a rota
// entra sozinha no pre-render.
const pagesDir = fileURLToPath(new URL('./pages', import.meta.url))
const pageExists = (route: string) =>
  existsSync(`${pagesDir}/${route.slice(1)}.vue`) ||
  existsSync(`${pagesDir}/${route.slice(1)}/index.vue`)

const existingCalculatorRoutes = CALCULATOR_ROUTES.filter(pageExists)
const knownFutureRoutes = [
  ...CALCULATOR_ROUTES,
  '/login',
  '/registro',
  '/perfil',
  ...LEGAL_LINKS.map((link) => link.path)
]
const routesWithoutPage = knownFutureRoutes.filter((route) => !pageExists(route))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-01-07',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap'
  ],

  // SSG: o comando nuxt generate renderiza o HTML de cada rota em tempo de build.
  ssr: true,

  // Dominio de producao. Pode ser sobrescrito por NUXT_PUBLIC_SITE_URL no build.
  site: {
    url: 'https://fittoolsbrasil.com.br',
    name: 'FitTools Brasil',
    defaultLocale: 'pt-BR'
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      ignore: routesWithoutPage,
      routes: ['/', ...existingCalculatorRoutes]
    }
  },

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css'
  },

  sitemap: {
    exclude: PRIVATE_ROUTES
  },

  robots: {
    disallow: PRIVATE_ROUTES,
    credits: false
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:3001',
      siteUrl: 'http://localhost:3000'
    }
  }
})