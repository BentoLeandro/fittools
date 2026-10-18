// Cliente HTTP da API do FitTools (Task 5.5).
// Fabrica pura: nao depende de Nuxt, Pinia nem do router. O `useApi` injeta as dependencias,
// e os testes injetam um fetcher falso. Usa o $fetch (ofetch) do Nuxt, sem biblioteca extra.

import type { ApiErrorBody } from '~/types/api'

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unknown'

/** Mensagem exibida quando nao ha resposta do servidor (Requisito 9.7). */
export const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar. Verifique sua conexão com a internet.'

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  network: NETWORK_ERROR_MESSAGE,
  timeout: 'O servidor demorou para responder. Tente novamente.',
  validation: 'Dados inválidos. Verifique os campos e tente novamente.',
  unauthorized: 'Sua sessão expirou. Entre novamente.',
  forbidden: 'Você não tem permissão para fazer isso.',
  not_found: 'Não encontramos o que você procura.',
  conflict: 'Esta informação já está em uso.',
  rate_limited: 'Muitas requisições. Tente novamente em alguns minutos.',
  server: 'Algo deu errado no servidor. Tente novamente em instantes.',
  unknown: 'Ocorreu um erro inesperado. Tente novamente.'
}

/** Erro padronizado de qualquer chamada a API. `message` e sempre seguro para exibir ao usuario. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  /** Status HTTP, ou undefined quando nao houve resposta (rede/timeout). */
  readonly status?: number
  /** Mensagens por campo nos erros de validacao (400). */
  readonly fields?: Record<string, string>
  /** Segundos ate poder tentar de novo (429). */
  readonly retryAfter?: number

  constructor(
    kind: ApiErrorKind,
    message: string,
    extra: { status?: number; fields?: Record<string, string>; retryAfter?: number } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = extra.status
    this.fields = extra.fields
    this.retryAfter = extra.retryAfter
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

/** Contrato minimo do fetcher: compativel com o $fetch do Nuxt. */
export type ApiFetcher = (url: string, options: Record<string, unknown>) => Promise<unknown>

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: object
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  /** Tempo maximo por tentativa, em ms. */
  timeout?: number
}

export interface ApiClientConfig {
  fetcher: ApiFetcher
  baseURL: string
  /** Token atual (lido a cada chamada, nunca guardado). */
  getToken: () => string | null | undefined
  /** Chamado quando uma requisicao COM token recebe 401. */
  onUnauthorized?: () => void | Promise<void>
  /** Injetavel para os testes nao esperarem de verdade. */
  sleep?: (ms: number) => Promise<void>
  /** Timeout padrao por tentativa, em ms. */
  timeout?: number
}

/** Esperas antes de cada nova tentativa (maximo 3). */
export const RETRY_DELAYS_MS = [300, 600, 1200] as const

const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'])
const RETRYABLE_STATUS: ReadonlySet<number> = new Set([502, 503, 504])
const DEFAULT_TIMEOUT_MS = 10_000

/** URL com esquema ("http:", "data:") ou "//host": o token nao pode vazar para outro destino. */
const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:|\/\/)/i

function defaultSleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

interface RawError {
  name?: string
  cause?: unknown
  status?: number
  statusCode?: number
  response?: { status?: number; headers?: { get?: (name: string) => string | null } }
  data?: unknown
}

function getStatus(raw: RawError): number | undefined {
  return raw.response?.status ?? raw.statusCode ?? raw.status
}

/** Procura AbortError/TimeoutError no erro e na cadeia de `cause`. */
function isTimeout(raw: RawError): boolean {
  let current: RawError | undefined = raw
  for (let depth = 0; current && depth < 4; depth++) {
    if (current.name === 'AbortError' || current.name === 'TimeoutError') return true
    current = current.cause as RawError | undefined
  }
  return false
}

function bodyOf(raw: RawError): Partial<ApiErrorBody> & { retryAfter?: unknown } {
  const data = raw.data
  return data && typeof data === 'object' ? (data as Partial<ApiErrorBody>) : {}
}

/** Aceita "fields" como texto ou lista de textos e devolve sempre texto. */
function normalizeFields(fields: unknown): Record<string, string> | undefined {
  if (!fields || typeof fields !== 'object') return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    const text = Array.isArray(value) ? value.find(v => typeof v === 'string') : value
    if (typeof text === 'string' && text) result[key] = text
  }
  return Object.keys(result).length ? result : undefined
}

function parseRetryAfter(raw: RawError, body: { retryAfter?: unknown }): number | undefined {
  const fromBody = Number(body.retryAfter)
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody
  const header = Number(raw.response?.headers?.get?.('retry-after'))
  return Number.isFinite(header) && header > 0 ? header : undefined
}

/** Converte qualquer erro do $fetch em ApiError. Mensagens 5xx nunca expõem o texto do servidor. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  const raw = (error ?? {}) as RawError
  const status = getStatus(raw)

  if (status === undefined) {
    return isTimeout(raw)
      ? new ApiError('timeout', FALLBACK_MESSAGES.timeout)
      : new ApiError('network', FALLBACK_MESSAGES.network)
  }

  const body = bodyOf(raw)
  // So confiamos na mensagem do servidor quando o corpo segue o nosso contrato
  // ({ error: "ValidationError", message: "..." }, ja em portugues). Erros padrao do Fastify
  // ("Route GET:/x not found") chegam em ingles e nao devem aparecer para o usuario.
  const isOurContract = typeof body.error === 'string' && /^[A-Za-z]+Error$/.test(body.error)
  const serverMessage =
    isOurContract && typeof body.message === 'string' && body.message ? body.message : undefined

  if (status >= 500) return new ApiError('server', FALLBACK_MESSAGES.server, { status })

  const kinds: Record<number, ApiErrorKind> = {
    400: 'validation',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    422: 'validation',
    429: 'rate_limited'
  }
  const kind = kinds[status] ?? 'unknown'
  return new ApiError(kind, serverMessage ?? FALLBACK_MESSAGES[kind], {
    status,
    fields: kind === 'validation' ? normalizeFields(body.fields) : undefined,
    retryAfter: kind === 'rate_limited' ? parseRetryAfter(raw, body) : undefined
  })
}

function isRetryable(error: ApiError, method: string): boolean {
  if (!IDEMPOTENT_METHODS.has(method)) return false
  if (error.kind === 'network' || error.kind === 'timeout') return true
  return error.status !== undefined && RETRYABLE_STATUS.has(error.status)
}

export function createApiClient(config: ApiClientConfig) {
  const sleep = config.sleep ?? defaultSleep

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    if (!path.startsWith('/') || ABSOLUTE_URL.test(path)) {
      // Erro de programacao, nao de rede: o token so pode ir para a nossa API.
      throw new Error(`useApi aceita apenas caminhos relativos iniciados por "/": ${path}`)
    }

    const method = (options.method ?? 'GET').toUpperCase()
    const token = config.getToken() || null
    const headers: Record<string, string> = { ...options.headers }
    if (token) headers.Authorization = `Bearer ${token}`

    for (let attempt = 0; ; attempt++) {
      try {
        return (await config.fetcher(path, {
          baseURL: config.baseURL,
          method,
          body: options.body,
          query: options.query,
          headers,
          timeout: options.timeout ?? config.timeout ?? DEFAULT_TIMEOUT_MS,
          // O ofetch repete sozinho em 408/409/425/429/500/502/503/504. Desligado: a politica
          // de tentativas e a nossa (abaixo), para nunca repetir 409/429/500 nem um POST.
          retry: false
        })) as T
      } catch (caught) {
        const error = toApiError(caught)
        if (attempt < RETRY_DELAYS_MS.length && isRetryable(error, method)) {
          await sleep(RETRY_DELAYS_MS[attempt]!)
          continue
        }
        // 401 so derruba a sessao se a requisicao carregava token. Um 401 de login
        // ("Email ou senha incorretos") nao pode deslogar nem redirecionar ninguem.
        if (error.kind === 'unauthorized' && token) await config.onUnauthorized?.()
        throw error
      }
    }
  }

  type BodylessOptions = Omit<ApiRequestOptions, 'method' | 'body'>
  type BodyOptions = Omit<ApiRequestOptions, 'method'>

  return {
    request,
    get: <T>(path: string, options?: BodylessOptions) => request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: object, options?: BodyOptions) =>
      request<T>(path, { ...options, body, method: 'POST' }),
    put: <T>(path: string, body?: object, options?: BodyOptions) =>
      request<T>(path, { ...options, body, method: 'PUT' }),
    del: <T>(path: string, options?: BodylessOptions) => request<T>(path, { ...options, method: 'DELETE' })
  }
}

export type ApiClient = ReturnType<typeof createApiClient>