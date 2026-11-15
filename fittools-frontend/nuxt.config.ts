import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CALCULATORS, LEGAL_LINKS } from './utils/site'

// Rotas das calculadoras (fonte unica: utils/site.ts). As URLs devem ser identicas as do
// site antigo (Requisitos 2.10 e 14.2); por isso a hidratacao e /calculadora-de-agua.
const CALCULATOR_ROUTES = CALCULATORS.map((calculator) => calculator.path)

// Paginas privadas ou de autenticacao: fora do sitemap e bloqueadas no robots.txt.
const PRIVATE_ROUTES = ['/login', '/registro', '/perfil']

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

// Build de TESTE (ex.: GitHub Pages): com FITTOOLS_TEST_BUILD=true o site sai com noindex e
// robots.txt bloqueando tudo, para o Google nao indexar uma copia fora do dominio oficial.
// O build de producao nao define essa variavel e continua indexavel.
const isTestBuild = process.env.FITTOOLS_TEST_BUILD === 'true'

// Subpasta onde o site e servido (NUXT_APP_BASE_URL, ex.: /fittools/ no GitHub Pages).
// Em producao fica '/'. Sempre comeca e termina com '/'.
const appBaseUrl = `/${(process.env.NUXT_APP_BASE_URL ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/')

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
    defaultLocale: 'pt-BR',
    indexable: !isTestBuild
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      // Com baseURL (GitHub Pages) o crawler enxerga os links ja prefixados, entao ignora as duas formas.
      ignore: [...routesWithoutPage, ...routesWithoutPage.map((route) => `${appBaseUrl.slice(0, -1)}${route}`)],
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
    // Em subpasta (GitHub Pages) o robots.txt nao teria efeito (so vale na raiz do dominio) e o
    // modulo recusa gera-lo; o bloqueio fica por conta da meta noindex de cada pagina.
    robotsTxt: appBaseUrl === '/',
    disallow: PRIVATE_ROUTES,
    credits: false
  },

  app: {
    baseURL: appBaseUrl,
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: `${appBaseUrl}favicon.svg` }]
    }
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:3001',
      siteUrl: 'http://localhost:3000'
    }
  }
})