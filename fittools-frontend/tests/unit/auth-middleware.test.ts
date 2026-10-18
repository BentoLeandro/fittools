import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore, AUTH_TOKEN_KEY } from '../../stores/user'
import { buildLoginRedirect, hasStoredToken, LOGIN_PATH } from '../../utils/auth-guard'

describe('hasStoredToken', () => {
  it('true quando a chave existe e tem valor', () => {
    expect(hasStoredToken({ getItem: () => 'abc' }, AUTH_TOKEN_KEY)).toBe(true)
  })

  it('false para ausente, vazio ou storage indefinido', () => {
    expect(hasStoredToken({ getItem: () => null }, AUTH_TOKEN_KEY)).toBe(false)
    expect(hasStoredToken({ getItem: () => '' }, AUTH_TOKEN_KEY)).toBe(false)
    expect(hasStoredToken(undefined, AUTH_TOKEN_KEY)).toBe(false)
  })

  it('false (sem lancar) quando o navegador bloqueia o localStorage', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      }
    }
    expect(hasStoredToken(blocked, AUTH_TOKEN_KEY)).toBe(false)
  })

  it('consulta a chave pedida', () => {
    const getItem = vi.fn().mockReturnValue(null)
    hasStoredToken({ getItem }, 'fittools_auth_token')
    expect(getItem).toHaveBeenCalledWith('fittools_auth_token')
  })
})

describe('buildLoginRedirect', () => {
  it('envia para /login guardando a rota completa (query e hash)', () => {
    expect(buildLoginRedirect({ fullPath: '/perfil?aba=saude#peso' })).toEqual({
      path: LOGIN_PATH,
      query: { redirect: '/perfil?aba=saude#peso' }
    })
    expect(LOGIN_PATH).toBe('/login')
  })
})

describe('middleware auth', () => {
  const navigateTo = vi.fn((to: unknown, opts?: unknown) => ({ to, opts }))
  const user = { id: '1', email: 'a@b.com', name: 'A', created_at: '' }
  let run: (to: { fullPath: string; path: string }) => unknown

  beforeEach(async () => {
    localStorage.clear()
    navigateTo.mockClear()
    setActivePinia(createPinia())
    // No Nuxt estes sao auto-importados; no Vitest puro precisam ser simulados.
    vi.stubGlobal('defineNuxtRouteMiddleware', (fn: unknown) => fn)
    vi.stubGlobal('navigateTo', navigateTo)
    vi.stubGlobal('useUserStore', useUserStore)
    vi.resetModules()
    run = (await import('../../middleware/auth')).default as typeof run
  })

  it('sem token redireciona para /login?redirect=<rota> com replace', () => {
    const result = run({ fullPath: '/perfil?x=1', path: '/perfil' })
    expect(navigateTo).toHaveBeenCalledWith(
      { path: '/login', query: { redirect: '/perfil?x=1' } },
      { replace: true }
    )
    expect(result).toBeDefined()
  })

  it('com token so no localStorage (recarga direta, store ainda vazio) deixa passar', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'abc.def.ghi')
    // No navegador o store (initOnMounted) ainda nao leu o localStorage quando o middleware roda.
    // No Vitest nao ha componente e ele leria na hora, entao simulamos o store ainda vazio.
    vi.stubGlobal('useUserStore', () => ({ isAuthenticated: false }))
    expect(run({ fullPath: '/perfil', path: '/perfil' })).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('com sessao ativa no store deixa passar', () => {
    useUserStore().login('abc.def.ghi', user)
    expect(run({ fullPath: '/perfil', path: '/perfil' })).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('depois do logout volta a redirecionar', () => {
    const store = useUserStore()
    store.login('abc.def.ghi', user)
    store.logout()
    run({ fullPath: '/perfil', path: '/perfil' })
    expect(navigateTo).toHaveBeenCalledTimes(1)
  })

})
