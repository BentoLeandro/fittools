import { AUTH_TOKEN_KEY } from '../stores/user'
import { buildLoginRedirect, hasStoredToken } from '../utils/auth-guard'

/**
 * Protege paginas privadas: `definePageMeta({ middleware: 'auth' })`.
 * Sem token, leva ao login com `?redirect=<rota original>`.
 *
 * Roda so no navegador. No build estatico (SSG) nao existe sessao, e redirecionar la
 * faria o servidor gerar uma pagina de redirecionamento em vez do HTML da pagina.
 * Isto confere apenas se ha token; token expirado ou invalido e tratado quando a API
 * responde 401 (useApi) e na verificacao feita na inicializacao do app.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const userStore = useUserStore()
  if (userStore.isAuthenticated || hasStoredToken(localStorage, AUTH_TOKEN_KEY)) return

  // replace: o "voltar" do navegador nao deve cair de novo numa pagina que redireciona.
  return navigateTo(buildLoginRedirect(to), { replace: true })
})