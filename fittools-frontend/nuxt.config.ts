// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  ssr: true,

  nitro: {
    prerender: {
      crawlLinks: true
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1'
    }
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:3001',
      siteUrl: 'http://localhost:3000'
    }
  },

  compatibilityDate: '2024-01-07'
})
