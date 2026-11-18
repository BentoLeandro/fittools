import net from 'node:net'
import rateLimit, { type RateLimitOptions } from '@fastify/rate-limit'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { TooManyRequestsError, UnauthorizedError } from '../utils/errors.util'
import { jwtMiddleware, requireUser } from './jwt.middleware'

/** Limites do design (Requisito 6). A janela é fixa: começa na primeira requisição da chave. */
export const RATE_LIMITS = {
  /** Rotas públicas: por IP. Inclui rotas que não existem (404). */
  public: { max: 60, timeWindow: '15 minutes' },
  /** Login: por IP, 5 tentativas (contam acertos e erros). */
  login: { max: 5, timeWindow: '15 minutes' },
  /** Cadastro: por IP, 3 por hora. */
  register: { max: 3, timeWindow: '60 minutes' },
  /** Rotas autenticadas: por usuário (id do token), em qualquer IP. */
  authenticated: { max: 300, timeWindow: '15 minutes' },
  /** /health: folga para o monitor externo e o health check do Caddy. */
  health: { max: 600, timeWindow: '15 minutes' }
} as const

/** Máximo de chaves guardadas por limitador (a mais antiga sai primeiro). */
const CACHE_SIZE = 10000

/** Health check do Docker roda dentro do container, em loopback, e nunca é limitado. */
const LOOPBACK = new Set(['127.0.0.1', '::1'])

/**
 * Chave de IP para limitar. IPv4 fica como está; "::ffff:1.2.3.4" vira "1.2.3.4"; IPv6 vira o
 * prefixo /64 (a rede inteira de um cliente), porque quem tem um /64 troca de endereço à vontade
 * e escaparia de um limite por endereço.
 */
export function ipKey(ip: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)
  if (mapped) {
    return mapped[1]
  }
  if (!net.isIPv6(ip) || ip === '::1') {
    return ip
  }

  let address = ip.split('%')[0] // remove o "%eth0" do IPv6 com escopo
  const embedded = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address)
  if (embedded) {
    const [a, b, c, d] = embedded[1].split('.').map(Number)
    address = address.replace(embedded[1], `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`)
  }

  const [head, tail] = address.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail === undefined ? [] : tail ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  const groups = tail === undefined ? headGroups : [...headGroups, ...Array(missing).fill('0'), ...tailGroups]

  return `${groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(':')}::/64`
}

function waitText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

function limiter(
  name: string,
  limit: { max: number; timeWindow: string },
  message: string,
  keyGenerator: (request: FastifyRequest) => string
): RateLimitOptions {
  return {
    max: limit.max,
    timeWindow: limit.timeWindow,
    cache: CACHE_SIZE,
    keyGenerator,
    errorResponseBuilder: (_request, context) => {
      const retryAfter = Math.max(1, Math.ceil(context.ttl / 1000))
      return new TooManyRequestsError(`${message} Tente novamente em ${waitText(retryAfter)}.`, retryAfter)
    },
    // Sinal de atividade suspeita (Requisito 6.6): quem bate no limite fica registrado
    onExceeded: (request, key) => {
      request.log.warn({ rateLimit: name, key }, 'Limite de requisições excedido')
    }
  }
}

const byIp = (request: FastifyRequest) => ipKey(request.ip)

/** Limite do login (use em `config: { rateLimit: loginRateLimit }`). */
export const loginRateLimit = limiter('login', RATE_LIMITS.login, 'Muitas tentativas de login.', byIp)

/** Limite do cadastro (use em `config: { rateLimit: registerRateLimit }`). */
export const registerRateLimit = limiter('register', RATE_LIMITS.register, 'Muitas tentativas de cadastro.', byIp)

/** Limite do /health (use em `config: { rateLimit: healthRateLimit }`). */
export const healthRateLimit = limiter('health', RATE_LIMITS.health, 'Muitas requisições.', byIp)

/**
 * Registra o plugin com o limite PÚBLICO (60 por 15 min por IP) em todas as rotas que não
 * definirem o próprio. Precisa vir antes das rotas. Fica de fora o loopback (health check do
 * Docker). O preflight CORS nunca chega aqui: o plugin de CORS o responde antes das rotas.
 */
export async function registerRateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    ...limiter('public', RATE_LIMITS.public, 'Muitas requisições.', byIp),
    allowList: (_request, key) => LOOPBACK.has(key)
  })

  app.decorate('authenticated', createAuthenticatedHooks(app))
}

type AuthenticatedHook = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Hooks das rotas autenticadas (use em `onRequest`, com `config: { rateLimit: false }`):
     *  1. exige o JWT; se a autenticação FALHAR (sem token, inválido, expirado), a tentativa conta
     *     no limite por IP (60 por 15 min). Quem tem token válido não gasta o limite do IP, então
     *     várias pessoas atrás do mesmo IP (escritório, faculdade) não se atrapalham;
     *  2. limite por USUÁRIO (300 por 15 min), contado pelo id do token, de qualquer IP.
     * O limite por usuário só pode rodar DEPOIS da autenticação: um limitador global (onRequest)
     * rodaria antes do JWT e nunca saberia quem é o usuário.
     * É UM conjunto só, criado no registro do plugin: todas as rotas autenticadas, de qualquer
     * arquivo, dividem os mesmos 300 do usuário.
     */
    authenticated: AuthenticatedHook[]
  }
}

function createAuthenticatedHooks(app: FastifyInstance): AuthenticatedHook[] {
  const failedAuthLimiter = app.rateLimit(
    limiter('auth-failures', RATE_LIMITS.public, 'Muitas requisições.', byIp)
  )
  const userLimiter = app.rateLimit(
    limiter('authenticated', RATE_LIMITS.authenticated, 'Muitas requisições.', (request) => requireUser(request).id)
  )

  const authenticate: AuthenticatedHook = async (request, reply) => {
    try {
      await jwtMiddleware(request, reply)
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        await failedAuthLimiter.call(app, request, reply) // lança 429 se o IP já passou do limite
      }
      throw error
    }
  }

  return [authenticate, userLimiter]
}