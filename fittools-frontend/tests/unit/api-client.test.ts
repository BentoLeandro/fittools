import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ofetch } from 'ofetch'
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  RETRY_DELAYS_MS,
  createApiClient,
  isApiError,
  toApiError,
  type ApiFetcher
} from '../../utils/api-client'

const BASE = 'http://api.test'

/** Erro no formato do FetchError do ofetch (resposta com status e corpo JSON). */
function httpError(status: number, data?: unknown, headers: Record<string, string> = {}) {
  return Object.assign(new Error(`HTTP ${status}`), {
    name: 'FetchError',
    status,
    statusCode: status,
    data,
    response: { status, headers: { get: (n: string) => headers[n.toLowerCase()] ?? null } }
  })
}

/** Erro sem resposta, como o fetch do navegador ("Failed to fetch"). */
function networkError() {
  return Object.assign(new Error('Failed to fetch'), { name: 'FetchError', cause: new TypeError('Failed to fetch') })
}

function abortError() {
  const cause = new DOMException('The operation was aborted.', 'AbortError')
  return Object.assign(new Error('timeout'), { name: 'FetchError', cause })
}

/** Espera que a promise falhe e devolve o ApiError lancado. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('Era esperado que a chamada falhasse')
}
let fetcher: ReturnType<typeof vi.fn>
let sleep: ReturnType<typeof vi.fn>
let token: string | null
let onUnauthorized: ReturnType<typeof vi.fn>

function client() {
  return createApiClient({
    fetcher: fetcher as unknown as ApiFetcher,
    baseURL: BASE,
    getToken: () => token,
    onUnauthorized,
    sleep: sleep as unknown as (ms: number) => Promise<void>
  })
}

beforeEach(() => {
  fetcher = vi.fn()
  sleep = vi.fn().mockResolvedValue(undefined)
  onUnauthorized = vi.fn()
  token = null
})

describe('requisicao basica', () => {
  it('usa baseURL, metodo, corpo e devolve a resposta', async () => {
    fetcher.mockResolvedValue({ ok: true })
    const result = await client().post<{ ok: boolean }>('/api/v1/auth/login', { email: 'a@b.com' })
    expect(result).toEqual({ ok: true })
    const [url, options] = fetcher.mock.calls[0]!
    expect(url).toBe('/api/v1/auth/login')
    expect(options).toMatchObject({ baseURL: BASE, method: 'POST', body: { email: 'a@b.com' } })
  })

  it('desliga o retry nativo do ofetch e define timeout', async () => {
    fetcher.mockResolvedValue({})
    await client().get('/health')
    const options = fetcher.mock.calls[0]![1]
    expect(options.retry).toBe(false)
    expect(options.timeout).toBeGreaterThan(0)
  })

  it('so permite sobrescrever o timeout por chamada', async () => {
    fetcher.mockResolvedValue({})
    await client().get('/health', { timeout: 500 })
    expect(fetcher.mock.calls[0]![1].timeout).toBe(500)
  })
})

describe('token', () => {
  it('anexa Authorization quando ha token', async () => {
    token = 'abc.def.ghi'
    fetcher.mockResolvedValue({})
    await client().get('/api/v1/users/me')
    expect(fetcher.mock.calls[0]![1].headers).toMatchObject({ Authorization: 'Bearer abc.def.ghi' })
  })

  it('nao envia Authorization sem token', async () => {
    fetcher.mockResolvedValue({})
    await client().get('/api/v1/users/me')
    expect(fetcher.mock.calls[0]![1].headers).not.toHaveProperty('Authorization')
  })

  it('le o token a cada chamada (login depois da criacao do cliente)', async () => {
    fetcher.mockResolvedValue({})
    const api = client()
    await api.get('/a')
    token = 'novo'
    await api.get('/b')
    expect(fetcher.mock.calls[0]![1].headers).not.toHaveProperty('Authorization')
    expect(fetcher.mock.calls[1]![1].headers).toMatchObject({ Authorization: 'Bearer novo' })
  })

  it.each(['https://evil.example/x', 'http://evil.example', '//evil.example/x', 'javascript:alert(1)', 'api/v1/x'])(
    'rejeita caminho que nao e relativo a nossa API: %s',
    async path => {
      token = 'segredo'
      await expect(client().get(path)).rejects.toThrow('caminhos relativos')
      expect(fetcher).not.toHaveBeenCalled()
    }
  )
})

describe('401', () => {
  it('com token: chama onUnauthorized uma vez e lanca unauthorized', async () => {
    token = 'expirado'
    fetcher.mockRejectedValue(httpError(401, { error: 'UnauthorizedError', message: 'Token expirado ou inválido' }))
    const error = await failure(client().get('/api/v1/users/me'))
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({ kind: 'unauthorized', status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('sem token (login errado): nao chama onUnauthorized e mostra a mensagem do servidor', async () => {
    fetcher.mockRejectedValue(httpError(401, { error: 'UnauthorizedError', message: 'Email ou senha incorretos' }))
    const error = await failure(client().post('/api/v1/auth/login', { email: 'a@b.com', password: 'x' }))
    expect(error).toMatchObject({ kind: 'unauthorized', message: 'Email ou senha incorretos' })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe('mapeamento de erros', () => {
  it('400 devolve fields (texto ou lista) e mensagem do servidor, sem retry', async () => {
    fetcher.mockRejectedValue(
      httpError(400, {
        error: 'ValidationError',
        message: 'Dados inválidos',
        fields: { email: 'Formato de email inválido', password: ['Mínimo de 8 caracteres'] }
      })
    )
    const error = await failure(client().post('/api/v1/auth/register', {}))
    expect(error).toMatchObject({
      kind: 'validation',
      status: 400,
      message: 'Dados inválidos',
      fields: { email: 'Formato de email inválido', password: 'Mínimo de 8 caracteres' }
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('404, 403 e 409 recebem o tipo certo', async () => {
    for (const [status, kind] of [[404, 'not_found'], [403, 'forbidden'], [409, 'conflict']] as const) {
      fetcher.mockReset()
      fetcher.mockRejectedValue(httpError(status))
      const error = await failure(client().get('/x'))
      expect(error).toMatchObject({ kind, status })
      expect(error.message.length).toBeGreaterThan(0)
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
  })

  it('409 mostra a mensagem do servidor (email duplicado)', async () => {
    fetcher.mockRejectedValue(httpError(409, { error: 'ConflictError', message: 'Email já cadastrado' }))
    const error = await failure(client().post('/api/v1/auth/register', {}))
    expect(error.message).toBe('Email já cadastrado')
  })

  it('429 nao repete e traz retryAfter (corpo ou cabecalho)', async () => {
    fetcher.mockRejectedValueOnce(httpError(429, { error: 'TooManyRequestsError', message: 'Muitas tentativas', retryAfter: 900 }))
    const a = await failure(client().get('/x'))
    expect(a).toMatchObject({ kind: 'rate_limited', status: 429, retryAfter: 900 })

    fetcher.mockRejectedValueOnce(httpError(429, undefined, { 'retry-after': '30' }))
    const b = await failure(client().get('/x'))
    expect(b.retryAfter).toBe(30)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('500 nao repete e nunca expoe a mensagem do servidor', async () => {
    fetcher.mockRejectedValue(httpError(500, { message: 'PrismaClientKnownRequestError: tabela users' }))
    const error = await failure(client().get('/x'))
    expect(error).toMatchObject({ kind: 'server', status: 500 })
    expect(error.message).not.toContain('Prisma')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('erro padrao do Fastify (ingles) nao vaza: usa a mensagem em portugues', async () => {
    fetcher.mockRejectedValue(
      httpError(404, { statusCode: 404, error: 'Not Found', message: 'Route GET:/api/v1/x not found' })
    )
    const error = await failure(client().get('/api/v1/x'))
    expect(error.kind).toBe('not_found')
    expect(error.message).toBe('Não encontramos o que você procura.')
  })
  it('status desconhecido vira unknown', () => {
    expect(toApiError(httpError(418)).kind).toBe('unknown')
  })

  it('toApiError nao reembrulha um ApiError', () => {
    const original = new ApiError('network', 'x')
    expect(toApiError(original)).toBe(original)
  })

  it('valor estranho lancado pelo fetcher vira network', () => {
    expect(toApiError(undefined).kind).toBe('network')
    expect(toApiError('boom').kind).toBe('network')
  })
})

describe('rede, timeout e tentativas', () => {
  it('falha de rede: mensagem exata do Requisito 9.7', async () => {
    fetcher.mockRejectedValue(networkError())
    const error = await failure(client().post('/api/v1/auth/login', {}))
    expect(error.kind).toBe('network')
    expect(error.message).toBe('Não foi possível conectar. Verifique sua conexão com a internet.')
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE)
  })

  it('GET repete 3 vezes com espera 300/600/1200 ms e depois falha', async () => {
    fetcher.mockRejectedValue(networkError())
    const error = await failure(client().get('/x'))
    expect(error.kind).toBe('network')
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(sleep.mock.calls.map(c => c[0])).toEqual([300, 600, 1200])
    expect([...RETRY_DELAYS_MS]).toEqual([300, 600, 1200])
  })

  it('POST nao e repetido (evita cadastro/envio duplicado)', async () => {
    fetcher.mockRejectedValue(networkError())
    await client().post('/api/v1/auth/register', {}).catch(() => {})
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('PUT e DELETE sao idempotentes e repetem', async () => {
    fetcher.mockRejectedValue(networkError())
    await client().put('/api/v1/users/me/profile', {}).catch(() => {})
    expect(fetcher).toHaveBeenCalledTimes(4)
    fetcher.mockClear()
    await client().del('/x').catch(() => {})
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('503 seguido de sucesso: devolve a resposta da segunda tentativa', async () => {
    fetcher.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce({ status: 'ok' })
    const result = await client().get('/health')
    expect(result).toEqual({ status: 'ok' })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(300)
  })

  it.each([502, 503, 504])('%i em GET e repetido', async status => {
    fetcher.mockRejectedValueOnce(httpError(status)).mockResolvedValueOnce({})
    await client().get('/x')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('503 em POST nao e repetido', async () => {
    fetcher.mockRejectedValue(httpError(503))
    const error = await failure(client().post('/x', {}))
    expect(error).toMatchObject({ kind: 'server', status: 503 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('timeout (AbortError) vira kind timeout e repete em GET', async () => {
    fetcher.mockRejectedValue(abortError())
    const error = await failure(client().get('/x'))
    expect(error.kind).toBe('timeout')
    expect(error.status).toBeUndefined()
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('TimeoutError (nome alternativo) tambem e timeout', () => {
    const cause = new DOMException('timed out', 'TimeoutError')
    expect(toApiError(Object.assign(new Error('x'), { cause })).kind).toBe('timeout')
  })

  it('401 com token nao repete', async () => {
    token = 't'
    fetcher.mockRejectedValue(httpError(401))
    await client().get('/x').catch(() => {})
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('integracao com o ofetch real', () => {
  const response = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  function realClient(fetchImpl: typeof fetch) {
    const instance = ofetch.create({}, { fetch: fetchImpl })
    return createApiClient({
      fetcher: ((url: string, options: Record<string, unknown>) => instance(url, options)) as ApiFetcher,
      baseURL: BASE,
      getToken: () => token,
      onUnauthorized,
      sleep: sleep as unknown as (ms: number) => Promise<void>
    })
  }

  it('retry:false impede o ofetch de repetir 500 e 429 por conta propria', async () => {
    for (const status of [500, 429, 409]) {
      const fetchMock = vi.fn().mockImplementation(async () => response(status, { message: 'x' }))
      const error = await failure(realClient(fetchMock as unknown as typeof fetch).get('/x'))
      expect(error).toMatchObject({ status })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  })

  it('lê o corpo JSON de erro e monta a URL com baseURL', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => response(400, { error: 'ValidationError', message: 'Dados inválidos', fields: { email: 'inválido' } }))
    const error = await failure(realClient(fetchMock as unknown as typeof fetch).post('/api/v1/auth/login', {}))
    expect(error).toMatchObject({ kind: 'validation', fields: { email: 'inválido' } })
    expect(String(fetchMock.mock.calls[0]![0])).toBe(`${BASE}/api/v1/auth/login`)
  })

  it('falha de rede real do fetch vira network e GET repete 3 vezes', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await failure(realClient(fetchMock as unknown as typeof fetch).get('/x'))
    expect(error.kind).toBe('network')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('sucesso devolve o JSON', async () => {
    token = 'tok'
    const fetchMock = vi.fn().mockImplementation(async () => response(200, { status: 'ok' }))
    const result = await realClient(fetchMock as unknown as typeof fetch).get('/health')
    expect(result).toEqual({ status: 'ok' })
    const request = fetchMock.mock.calls[0]![1] as { headers: Headers }
    expect(new Headers(request.headers).get('authorization')).toBe('Bearer tok')
  })
})