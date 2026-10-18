import { createApiClient, type ApiFetcher } from '~/utils/api-client'

/** Rotas de autenticacao: nao faz sentido redirecionar para o login estando nelas. */
const AUTH_PAGES = ['/login', '/registro']

/**
 * Cliente da API do FitTools (`/api/v1`). Anexa o token JWT quando existe, converte erros em
 * `ApiError` com mensagem em portugues e repete apenas falhas transitórias de rede (ver api-client).
 * Se uma chamada autenticada receber 401, encerra a sessao e leva o usuario ao login.
 *
 * Deve ser chamado dentro do setup de um componente, middleware ou plugin.
 */
export function useApi() {
  const { public: publicConfig } = useRuntimeConfig()
  const userStore = useUserStore()
  // O router e capturado agora: depois de um await, o contexto do Nuxt ja nao esta disponivel.
  const router = useRouter()

  return createApiClient({
    fetcher: $fetch as unknown as ApiFetcher,
    baseURL: publicConfig.apiBaseUrl,
    getToken: () => userStore.token,
    onUnauthorized: async () => {
      // Se outra chamada ja encerrou a sessao, nao repete o redirecionamento.
      if (!userStore.isAuthenticated) return
      userStore.logout()
      const current = router.currentRoute.value
      if (AUTH_PAGES.includes(current.path)) return
      await router.push({ path: '/login', query: { redirect: current.fullPath } })
    }
  })
}