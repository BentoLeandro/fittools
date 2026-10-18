import { defineStore, skipHydrate } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type {
  HealthProfile,
  HealthProfileInput,
  MeResponse,
  UpdateProfileResponse,
  User
} from '~/types/api'

/** Chave do token de autenticacao no localStorage (Requisito 8.2). */
export const AUTH_TOKEN_KEY = 'fittools_auth_token'

/** Extrai o status HTTP de um erro do $fetch (ou undefined se nao houve resposta). */
function getStatus(error: unknown): number | undefined {
  const e = error as { response?: { status?: number }; statusCode?: number; status?: number }
  return e?.response?.status ?? e?.statusCode ?? e?.status
}

export const useUserStore = defineStore('user', () => {
  // O token so e lido do localStorage depois da montagem (initOnMounted). Assim o HTML
  // gerado no build (sempre "visitante") e a primeira renderizacao no navegador batem,
  // sem erro de hidratacao. Definir como null remove a chave do localStorage.
  // skipHydrate: o payload do SSG traz 	oken: null (o HTML sai sempre como visitante). Sem isso o
  // Pinia copia esse null para o ref na hidratacao e o useLocalStorage apaga o token salvo,
  // deslogando o usuario a cada recarga de pagina.
  const token = skipHydrate(useLocalStorage<string | null>(AUTH_TOKEN_KEY, null, {
    initOnMounted: true,
    // Grava no localStorage na hora (e nao no proximo tick): um login seguido de recarga
    // ou redirecionamento imediato nao pode perder o token.
    flush: 'sync',
    // Sem sincronizacao entre abas. Com ela ligada, o VueUse pausa a gravacao ate o proximo
    // tick depois de cada escrita, e um logout logo apos o login deixaria o token no storage.
    // O JWT e sem estado: sair em uma aba nao invalida o token no servidor, entao nao ha
    // ganho de seguranca em espelhar o logout entre abas.
    listenToStorageChanges: false
  }))
  const user = ref<User | null>(null)
  const healthProfile = ref<HealthProfile | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const currentUser = computed(() => user.value)
  const hasHealthProfile = computed(() => healthProfile.value !== null)
  const userName = computed(() => user.value?.name ?? '')

  /** Chamada autenticada a API. Usa $fetch direto para o store nao depender do useApi (5.5). */
  function apiFetch<T>(path: string, options: { method?: 'GET' | 'PUT'; body?: object } = {}) {
    const { public: publicConfig } = useRuntimeConfig()
    return $fetch<T>(path, {
      baseURL: publicConfig.apiBaseUrl,
      method: options.method ?? 'GET',
      body: options.body as Record<string, unknown> | undefined,
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined
    })
  }

  /** Guarda a sessao apos login ou registro. */
  function login(newToken: string, newUser: User) {
    token.value = newToken
    user.value = newUser
  }

  /** Encerra a sessao: remove o token do localStorage e zera os dados. */
  function logout() {
    token.value = null
    user.value = null
    healthProfile.value = null
  }

  /**
   * Busca usuario e perfil em GET /api/v1/users/me. Retorna true se carregou.
   * Token invalido ou expirado (401) encerra a sessao; falha de rede mantem o token.
   */
  async function fetchUserData(): Promise<boolean> {
    if (!token.value) return false
    try {
      const data = await apiFetch<MeResponse>('/api/v1/users/me')
      user.value = data.user
      healthProfile.value = data.health_profile
      return true
    } catch (error) {
      if (getStatus(error) === 401) logout()
      return false
    }
  }

  /**
   * Salva o perfil de saude em PUT /api/v1/users/me/profile e atualiza o store.
   * Os erros (ex.: validacao 400) sobem para o chamador exibir; 401 encerra a sessao.
   */
  async function updateHealthProfile(profile: HealthProfileInput): Promise<HealthProfile> {
    try {
      const data = await apiFetch<UpdateProfileResponse>('/api/v1/users/me/profile', {
        method: 'PUT',
        body: profile
      })
      healthProfile.value = data.health_profile
      return data.health_profile
    } catch (error) {
      if (getStatus(error) === 401) logout()
      throw error
    }
  }

  return {
    token,
    user,
    healthProfile,
    isAuthenticated,
    currentUser,
    hasHealthProfile,
    userName,
    login,
    logout,
    fetchUserData,
    updateHealthProfile
  }
})