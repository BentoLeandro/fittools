import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AUTH_TOKEN_KEY, useUserStore } from '../../stores/user'
import type { HealthProfile, User } from '../../types/api'

const API = 'http://api.test'

const fakeUser: User = {
  id: 'u1',
  email: 'joao@exemplo.com.br',
  name: 'João Silva',
  created_at: '2026-10-16T12:00:00.000Z'
}

const fakeProfile: HealthProfile = {
  id: 'p1',
  weight_kg: 82.5,
  height_cm: 178,
  age: 28,
  sex: 'male',
  activity_level: 'moderately_active',
  fitness_goal: 'muscle_gain',
  updated_at: '2026-10-16T12:00:00.000Z'
}

/** Erro no formato do ofetch ($fetch) quando o servidor responde com status de erro. */
function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status }, statusCode: status })
}

const fetchMock = vi.fn()

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  // No Nuxt estes dois sao auto-importados; no Vitest puro precisam ser simulados.
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBaseUrl: API } }))
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('userStore: sessão', () => {
  it('começa como visitante, sem token nem dados', () => {
    const store = useUserStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.currentUser).toBeNull()
    expect(store.hasHealthProfile).toBe(false)
    expect(store.userName).toBe('')
  })

  it('login guarda a sessão e grava o token puro no localStorage', () => {
    const store = useUserStore()
    store.login('abc.def.ghi', fakeUser)

    expect(store.isAuthenticated).toBe(true)
    expect(store.currentUser).toEqual(fakeUser)
    expect(store.userName).toBe('João Silva')
    // Chave exigida pelo Requisito 8.2, valor sem aspas JSON
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('abc.def.ghi')
    expect(AUTH_TOKEN_KEY).toBe('fittools_auth_token')
  })

  it('logout remove a chave do localStorage e zera os dados', () => {
    const store = useUserStore()
    store.login('abc.def.ghi', fakeUser)
    // O token precisa existir antes do logout; senao o teste passaria sem provar nada
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('abc.def.ghi')
    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.currentUser).toBeNull()
    expect(store.healthProfile).toBeNull()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('a sessão sobrevive a um recarregamento da página', () => {
    useUserStore().login('abc.def.ghi', fakeUser)

    // "Recarregar": store novo, lendo o mesmo localStorage
    setActivePinia(createPinia())
    const reloaded = useUserStore()
    expect(reloaded.isAuthenticated).toBe(true)
    expect(reloaded.token).toBe('abc.def.ghi')
  })
})

describe('userStore: fetchUserData', () => {
  it('sem token não chama a API e retorna false', async () => {
    const store = useUserStore()
    expect(await store.fetchUserData()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('busca /api/v1/users/me com o token e preenche usuário e perfil', async () => {
    fetchMock.mockResolvedValue({ user: fakeUser, health_profile: fakeProfile })
    const store = useUserStore()
    store.login('tok123', { ...fakeUser, name: 'Antigo' })

    expect(await store.fetchUserData()).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/v1/users/me')
    expect(options.baseURL).toBe(API)
    expect(options.method).toBe('GET')
    expect(options.headers).toEqual({ Authorization: 'Bearer tok123' })
    expect(store.currentUser?.name).toBe('João Silva')
    expect(store.hasHealthProfile).toBe(true)
    expect(store.healthProfile?.weight_kg).toBe(82.5)
  })

  it('usuário sem perfil: hasHealthProfile fica false', async () => {
    fetchMock.mockResolvedValue({ user: fakeUser, health_profile: null })
    const store = useUserStore()
    store.login('tok123', fakeUser)

    expect(await store.fetchUserData()).toBe(true)
    expect(store.hasHealthProfile).toBe(false)
  })

  it('401 (token inválido ou expirado) encerra a sessão', async () => {
    fetchMock.mockRejectedValue(httpError(401))
    const store = useUserStore()
    store.login('expirado', fakeUser)

    expect(await store.fetchUserData()).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
  })

  it('falha de rede NÃO derruba a sessão', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const store = useUserStore()
    store.login('tok123', fakeUser)

    expect(await store.fetchUserData()).toBe(false)
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('tok123')
  })

  it('erro 500 do servidor também mantém a sessão', async () => {
    fetchMock.mockRejectedValue(httpError(500))
    const store = useUserStore()
    store.login('tok123', fakeUser)

    expect(await store.fetchUserData()).toBe(false)
    expect(store.isAuthenticated).toBe(true)
  })
})

describe('userStore: updateHealthProfile', () => {
  it('envia PUT autenticado e atualiza o perfil no store', async () => {
    fetchMock.mockResolvedValue({ health_profile: fakeProfile })
    const store = useUserStore()
    store.login('tok123', fakeUser)

    const saved = await store.updateHealthProfile({ weight_kg: 82.5, sex: 'male' })

    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/v1/users/me/profile')
    expect(options.method).toBe('PUT')
    expect(options.body).toEqual({ weight_kg: 82.5, sex: 'male' })
    expect(options.headers).toEqual({ Authorization: 'Bearer tok123' })
    expect(saved).toEqual(fakeProfile)
    expect(store.healthProfile).toEqual(fakeProfile)
  })

  it('erro de validação (400) sobe para o chamador e mantém a sessão', async () => {
    fetchMock.mockRejectedValue(httpError(400))
    const store = useUserStore()
    store.login('tok123', fakeUser)

    await expect(store.updateHealthProfile({ age: 5 })).rejects.toMatchObject({ statusCode: 400 })
    expect(store.isAuthenticated).toBe(true)
  })

  it('401 encerra a sessão e também sobe o erro', async () => {
    fetchMock.mockRejectedValue(httpError(401))
    const store = useUserStore()
    store.login('expirado', fakeUser)

    await expect(store.updateHealthProfile({ age: 30 })).rejects.toMatchObject({ statusCode: 401 })
    expect(store.isAuthenticated).toBe(false)
  })
})