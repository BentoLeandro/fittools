import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../src/database/client'
import { authService } from '../../src/services/auth.service'
import { signJWT } from '../../src/utils/jwt.util'
import { createLogCapture, createTestApp, createUser, jsonOf, resetDatabase } from './helpers'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

interface LimitBody {
  error: string
  message: string
  retryAfter: number
}

const NOT_FOUND = '/api/v1/nao-existe'
const LOGIN = '/api/v1/auth/login'
const REGISTER = '/api/v1/auth/register'
const ME = '/api/v1/users/me'
const PROFILE = '/api/v1/users/me/profile'
const IP_A = '203.0.113.10'
const IP_B = '203.0.113.20'
const IP_C = '203.0.113.30'

let app: TestApp

const get = (url: string, ip: string | undefined, headers: Record<string, string> = {}) =>
  app.inject({ method: 'GET', url, remoteAddress: ip, headers })

const post = (url: string, ip: string | undefined, payload: unknown = {}, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url, remoteAddress: ip, headers, payload: payload as object })

const bearer = (token: string) => ({ authorization: `Bearer ${token}` })

/** Envia `count` requisições em sequência e devolve só os status. */
async function repeat(count: number, send: () => Promise<{ statusCode: number }>): Promise<number[]> {
  const statuses: number[] = []
  for (let i = 0; i < count; i++) statuses.push((await send()).statusCode)
  return statuses
}

const allEqual = (statuses: number[], value: number) => statuses.every((status) => status === value)

function expectTooMany(response: { statusCode: number; body: string; headers: Record<string, unknown> }, messagePattern: RegExp, maxSeconds: number) {
  expect(response.statusCode).toBe(429)
  const body = JSON.parse(response.body) as LimitBody
  expect(Object.keys(body).sort()).toEqual(['error', 'message', 'retryAfter'])
  expect(body.error).toBe('TooManyRequestsError')
  expect(body.message).toMatch(messagePattern)
  expect(Number.isInteger(body.retryAfter)).toBe(true)
  expect(body.retryAfter).toBeGreaterThan(0)
  expect(body.retryAfter).toBeLessThanOrEqual(maxSeconds)
  expect(response.headers['retry-after']).toBe(String(body.retryAfter))
  expect(String(response.headers['content-type'])).toMatch(/^application\/json/)
  return body
}

beforeAll(async () => {
  await resetDatabase()
})

// Cada teste usa um app NOVO: os contadores ficam na memória do app
beforeEach(async () => {
  app = await createTestApp()
})

afterEach(async () => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  await app.close()
})

afterAll(async () => {
  await resetDatabase()
  await prisma.$disconnect()
})

describe('limite público: 60 por 15 minutos por IP', () => {
  it('a 61ª requisição devolve 429 com o corpo e os cabeçalhos do design', async () => {
    const statuses = await repeat(60, () => get(NOT_FOUND, IP_A))
    expect(allEqual(statuses, 404)).toBe(true)

    const blocked = await get(NOT_FOUND, IP_A)
    expectTooMany(blocked, /^Muitas requisições\. Tente novamente em (1[0-5]|[1-9]) minutos?\.$/, 900)
    expect(blocked.headers['x-ratelimit-limit']).toBe('60')
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0')
  })

  it('as respostas permitidas informam o limite e quantas restam', async () => {
    const first = await get(NOT_FOUND, IP_A)
    expect(first.statusCode).toBe(404)
    expect(first.headers['x-ratelimit-limit']).toBe('60')
    expect(first.headers['x-ratelimit-remaining']).toBe('59')

    const second = await get(NOT_FOUND, IP_A)
    expect(second.headers['x-ratelimit-remaining']).toBe('58')
  })

  it('cada IP tem o próprio contador', async () => {
    await repeat(61, () => get(NOT_FOUND, IP_A))
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(429)
    expect((await get(NOT_FOUND, IP_B)).statusCode).toBe(404)
  })

  it('o contador é um só para todas as rotas públicas e métodos (GET e POST em URLs diferentes)', async () => {
    await repeat(30, () => get('/api/v1/a', IP_A))
    await repeat(30, () => post('/api/v1/b', IP_A))
    expect((await get('/api/v1/c', IP_A)).statusCode).toBe(429)
  })

  it('rotas que não existem também contam (varredura de URLs)', async () => {
    const urls = Array.from({ length: 60 }, (_, i) => `/wp-admin/${i}`)
    for (const url of urls) await get(url, IP_A)
    expect((await get('/phpmyadmin', IP_A)).statusCode).toBe(429)
  })

  it('o IPv4 e o IPv4 dentro de IPv6 (::ffff:) dividem o mesmo contador', async () => {
    await repeat(60, () => get(NOT_FOUND, '203.0.113.77'))
    expect((await get(NOT_FOUND, '::ffff:203.0.113.77')).statusCode).toBe(429)
  })

  it('no IPv6 o contador é do /64: trocar o final do endereço não escapa do limite', async () => {
    for (let i = 1; i <= 60; i++) await get(NOT_FOUND, `2001:db8:abcd:1::${i.toString(16)}`)
    expect((await get(NOT_FOUND, '2001:db8:abcd:1:ffff:eeee:dddd:1')).statusCode).toBe(429)
    expect((await get(NOT_FOUND, '2001:db8:abcd:2::1')).statusCode).toBe(404)
  })

  it('o cabeçalho X-Forwarded-For não muda o IP fora de produção (não dá para fingir ser 127.0.0.1)', async () => {
    const statuses = await repeat(61, () => get(NOT_FOUND, IP_A, { 'x-forwarded-for': '127.0.0.1' }))
    expect(statuses[60]).toBe(429)
    const rotating = await repeat(5, () => get(NOT_FOUND, IP_A, { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200)}` }))
    expect(allEqual(rotating, 429)).toBe(true)
  })

  it.each([undefined, '::1', '::ffff:127.0.0.1', '127.0.0.1'])('o loopback (%s) nunca é limitado (health check do Docker)', async (ip) => {
    const statuses = await repeat(80, () => get(NOT_FOUND, ip))
    expect(allEqual(statuses, 404)).toBe(true)
  })

  it('o preflight CORS (OPTIONS) nunca é limitado nem gasta o contador', async () => {
    await repeat(60, () => get(NOT_FOUND, IP_A))
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: PROFILE,
      remoteAddress: IP_A,
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'PUT' }
    })
    expect(preflight.statusCode).toBe(204)
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    // nem consumiu o contador: o IP continua no 61º, ainda bloqueado só por ter passado de 60
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(429)
  })

  it('a janela é de 15 minutos: antes disso continua bloqueado, depois volta ao normal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-05-01T12:00:00Z'))
    await repeat(60, () => get(NOT_FOUND, IP_A))
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(429)

    vi.setSystemTime(new Date('2030-05-01T12:14:00Z'))
    const stillBlocked = await get(NOT_FOUND, IP_A)
    expectTooMany(stillBlocked, /Tente novamente em 1 minuto\.$/, 60)

    vi.setSystemTime(new Date('2030-05-01T12:15:01Z'))
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(404)
  })

  it('o /health tem contador próprio (600): esgotar o público não derruba o monitoramento', async () => {
    await repeat(61, () => get(NOT_FOUND, IP_A))
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(429)

    const health = await get('/health', IP_A)
    expect(health.statusCode).toBe(200)
    expect(health.headers['x-ratelimit-limit']).toBe('600')
  })

  it('o limite público registra um aviso (warn) com o nome do limitador e o IP, sem dados sensíveis', async () => {
    const capture = createLogCapture()
    const logged = await createTestApp({ logStream: capture.stream })
    try {
      for (let i = 0; i < 61; i++) {
        await logged.inject({ method: 'GET', url: NOT_FOUND, remoteAddress: IP_A, headers: { authorization: 'Bearer SEGREDO-NO-TOKEN' } })
      }
      const warnings = capture.text().split('\n').filter((line) => line.includes('"rateLimit":"public"'))
      expect(warnings).toHaveLength(1)
      const entry = JSON.parse(warnings[0]) as { level: number; key: string; msg: string }
      expect(entry.level).toBe(40)
      expect(entry.key).toBe(IP_A)
      expect(entry.msg).toBe('Limite de requisições excedido')
      expect(capture.text()).not.toContain('SEGREDO-NO-TOKEN')
    } finally {
      await logged.close()
    }
  })

  it('o frontend consegue ler o Retry-After (CORS expõe o cabeçalho)', async () => {
    const response = await get(NOT_FOUND, IP_A, { origin: 'http://localhost:3000' })
    const exposed = String(response.headers['access-control-expose-headers'])
    expect(exposed).toContain('Retry-After')
    expect(exposed).toContain('X-RateLimit-Remaining')
  })
})

describe('login: 5 tentativas por 15 minutos por IP', () => {
  it('a 6ª tentativa devolve 429 com a mensagem do design e o tempo de espera', async () => {
    const statuses = await repeat(5, () => post(LOGIN, IP_A, {}))
    expect(allEqual(statuses, 400)).toBe(true)

    const blocked = await post(LOGIN, IP_A, {})
    const body = expectTooMany(blocked, /^Muitas tentativas de login\. Tente novamente em 15 minutos\.$/, 900)
    expect(body.retryAfter).toBeGreaterThan(890)
    expect(blocked.headers['x-ratelimit-limit']).toBe('5')
  })

  it('o limite é checado ANTES de ler o corpo e de rodar o bcrypt', async () => {
    await repeat(5, () => post(LOGIN, IP_A, { email: 'x@example.com', password: 'qualquer' }))
    const spy = vi.spyOn(authService, 'verifyPassword')

    const brokenJson = await app.inject({
      method: 'POST',
      url: LOGIN,
      remoteAddress: IP_A,
      headers: { 'content-type': 'application/json' },
      payload: '{"email": '
    })
    expect(brokenJson.statusCode).toBe(429)
    expect((await post(LOGIN, IP_A, { email: 'x@example.com', password: 'qualquer' })).statusCode).toBe(429)
    expect(spy).not.toHaveBeenCalled()
  })

  it('conta erros e acertos, e as credenciais certas NÃO furam o bloqueio', async () => {
    await resetDatabase()
    await createUser({ email: 'maria@example.com', password: 'Senha1234' })
    const attempts = await repeat(5, () => post(LOGIN, IP_A, { email: 'maria@example.com', password: 'SenhaErrada99' }))
    expect(allEqual(attempts, 401)).toBe(true)

    const correct = await post(LOGIN, IP_A, { email: 'maria@example.com', password: 'Senha1234' })
    expect(correct.statusCode).toBe(429)
    expect(correct.body).not.toContain('token')
  })

  it('5 logins certos seguidos também esgotam o limite do IP', async () => {
    await resetDatabase()
    await createUser({ email: 'maria@example.com', password: 'Senha1234' })
    const ok = await repeat(5, () => post(LOGIN, IP_A, { email: 'maria@example.com', password: 'Senha1234' }))
    expect(allEqual(ok, 200)).toBe(true)
    expect((await post(LOGIN, IP_A, { email: 'maria@example.com', password: 'Senha1234' })).statusCode).toBe(429)
  })

  it('outro IP não é afetado', async () => {
    await repeat(6, () => post(LOGIN, IP_A, {}))
    expect((await post(LOGIN, IP_A, {})).statusCode).toBe(429)
    expect((await post(LOGIN, IP_B, {})).statusCode).toBe(400)
  })

  it('o contador do login é separado do público e do cadastro', async () => {
    await repeat(6, () => post(LOGIN, IP_A, {}))
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(404)
    expect((await post(REGISTER, IP_A, {})).statusCode).toBe(400)
  })

  it('esgotar o limite público não bloqueia o login do mesmo IP', async () => {
    await repeat(61, () => get(NOT_FOUND, IP_A))
    expect((await get(NOT_FOUND, IP_A)).statusCode).toBe(429)
    expect((await post(LOGIN, IP_A, {})).statusCode).toBe(400)
  })

  it('depois de 15 minutos o IP volta a poder tentar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-05-01T12:00:00Z'))
    await repeat(6, () => post(LOGIN, IP_A, {}))
    expect((await post(LOGIN, IP_A, {})).statusCode).toBe(429)

    vi.setSystemTime(new Date('2030-05-01T12:15:01Z'))
    expect((await post(LOGIN, IP_A, {})).statusCode).toBe(400)
  })

  it('o loopback não é limitado (desenvolvimento local)', async () => {
    const statuses = await repeat(8, () => post(LOGIN, undefined, {}))
    expect(allEqual(statuses, 400)).toBe(true)
  })

  it('registra o aviso do bloqueio do login', async () => {
    const capture = createLogCapture()
    const logged = await createTestApp({ logStream: capture.stream })
    try {
      for (let i = 0; i < 6; i++) {
        await logged.inject({ method: 'POST', url: LOGIN, remoteAddress: IP_A, payload: { email: 'a@b.com', password: 'Senha-Secreta-1' } })
      }
      const logs = capture.text()
      expect(logs).toContain('"rateLimit":"login"')
      expect(logs).not.toContain('Senha-Secreta-1')
    } finally {
      await logged.close()
    }
  })
})

describe('cadastro: 3 por hora por IP', () => {
  it('o 4º cadastro devolve 429 e nenhum usuário extra é criado', async () => {
    await resetDatabase()
    const created = []
    for (let i = 0; i < 3; i++) {
      created.push(await post(REGISTER, IP_A, { email: `novo${i}@example.com`, password: 'Senha1234', name: 'Novo Usuário' }))
    }
    expect(created.map((r) => r.statusCode)).toEqual([201, 201, 201])

    const blocked = await post(REGISTER, IP_A, { email: 'novo3@example.com', password: 'Senha1234', name: 'Novo Usuário' })
    const body = expectTooMany(blocked, /^Muitas tentativas de cadastro\. Tente novamente em (60|59|58) minutos\.$/, 3600)
    expect(body.retryAfter).toBeGreaterThan(3500)
    expect(blocked.headers['x-ratelimit-limit']).toBe('3')
    expect(await prisma.user.count()).toBe(3)
    await resetDatabase()
  })

  it('tentativas inválidas também contam, e outro IP não é afetado', async () => {
    await repeat(3, () => post(REGISTER, IP_A, {}))
    expect((await post(REGISTER, IP_A, {})).statusCode).toBe(429)
    expect((await post(REGISTER, IP_B, {})).statusCode).toBe(400)
  })

  it('a janela do cadastro é de 60 minutos', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-05-01T12:00:00Z'))
    await repeat(3, () => post(REGISTER, IP_A, {}))
    expect((await post(REGISTER, IP_A, {})).statusCode).toBe(429)

    vi.setSystemTime(new Date('2030-05-01T12:30:00Z'))
    expect((await post(REGISTER, IP_A, {})).statusCode).toBe(429)

    vi.setSystemTime(new Date('2030-05-01T13:00:01Z'))
    expect((await post(REGISTER, IP_A, {})).statusCode).toBe(400)
  })
})

describe('rotas autenticadas: 300 por 15 minutos por usuário', () => {
  let userA: { id: string; email: string }
  let userB: { id: string; email: string }
  let tokenA: string
  let tokenB: string

  beforeEach(async () => {
    await resetDatabase()
    userA = await createUser({ email: 'a@example.com', passwordHash: 'x' })
    userB = await createUser({ email: 'b@example.com', passwordHash: 'x' })
    tokenA = signJWT(userA.id, userA.email)
    tokenB = signJWT(userB.id, userB.email)
  })

  const meAs = (token: string, ip: string | undefined = IP_A) => get(ME, ip, bearer(token))

  /** Envia `count` chamadas em paralelo (a ordem não importa até estourar o limite). */
  async function burst(count: number, send: () => Promise<{ statusCode: number }>) {
    return (await Promise.all(Array.from({ length: count }, send))).map((r) => r.statusCode)
  }

  it('a 301ª requisição do usuário devolve 429; as 300 primeiras passam', async () => {
    const statuses = await burst(300, () => meAs(tokenA))
    expect(allEqual(statuses, 200)).toBe(true)

    const blocked = await meAs(tokenA)
    expectTooMany(blocked, /^Muitas requisições\. Tente novamente em (1[0-5]|[1-9]) minutos?\.$/, 900)
    expect(blocked.headers['x-ratelimit-limit']).toBe('300')
    expect(blocked.headers['x-ratelimit-remaining']).toBe('0')
  })

  it('o contador é do USUÁRIO: outro usuário no mesmo IP não é afetado', async () => {
    await burst(300, () => meAs(tokenA))
    expect((await meAs(tokenA)).statusCode).toBe(429)
    expect((await meAs(tokenB)).statusCode).toBe(200)
  })

  it('o contador acompanha o usuário em QUALQUER IP', async () => {
    await burst(300, () => meAs(tokenA, IP_A))
    expect((await meAs(tokenA, IP_B)).statusCode).toBe(429)
    expect((await meAs(tokenA, IP_C)).statusCode).toBe(429)
  })

  it('o loopback não livra o usuário do limite (a exceção é só para o IP)', async () => {
    await burst(300, () => meAs(tokenA, undefined))
    expect((await meAs(tokenA, undefined)).statusCode).toBe(429)
  })

  it('os 300 valem para o usuário todo: GET /me e PUT /me/profile dividem o mesmo contador', async () => {
    await burst(299, () => meAs(tokenA))
    const put = await app.inject({ method: 'PUT', url: PROFILE, remoteAddress: IP_A, headers: bearer(tokenA), payload: { age: 30 } })
    expect(put.statusCode).toBe(200)

    expect((await meAs(tokenA)).statusCode).toBe(429)
    const blockedPut = await app.inject({ method: 'PUT', url: PROFILE, remoteAddress: IP_A, headers: bearer(tokenA), payload: { age: 31 } })
    expect(blockedPut.statusCode).toBe(429)
    expect((await prisma.userHealthProfile.findUnique({ where: { user_id: userA.id } }))?.age).toBe(30)
  })

  it('rotas autenticadas de OUTRO plugin dividem os mesmos 300 do usuário', async () => {
    await app.close()
    app = await createTestApp({
      configure: (instance) => {
        void instance.register(async (child) => {
          child.get('/__test/outro-plugin', { config: { rateLimit: false as const }, onRequest: [...child.authenticated] }, async () => ({ ok: true }))
        })
      }
    })
    await burst(299, () => meAs(tokenA))
    const other = await get('/__test/outro-plugin', IP_A, bearer(tokenA))
    expect(other.statusCode).toBe(200)

    expect((await meAs(tokenA)).statusCode).toBe(429)
    expect((await get('/__test/outro-plugin', IP_A, bearer(tokenA))).statusCode).toBe(429)
    expect((await get('/__test/outro-plugin', IP_A, bearer(tokenB))).statusCode).toBe(200)
  })

  it('requisições válidas NÃO gastam o limite do IP (várias pessoas atrás do mesmo IP não se atrapalham)', async () => {
    await burst(120, () => meAs(tokenA))
    await burst(120, () => meAs(tokenB))
    const withoutToken = await get(ME, IP_A)
    expect(withoutToken.statusCode).toBe(401)
  })

  it('o limite por usuário é checado antes do corpo: JSON quebrado com o usuário bloqueado dá 429', async () => {
    await burst(300, () => meAs(tokenA))
    const response = await app.inject({
      method: 'PUT',
      url: PROFILE,
      remoteAddress: IP_A,
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      payload: '{"age": '
    })
    expect(response.statusCode).toBe(429)
  })

  it('depois de 15 minutos o usuário volta a poder usar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-05-01T12:00:00Z'))
    const freshToken = signJWT(userA.id, userA.email)
    await burst(300, () => meAs(freshToken))
    expect((await meAs(freshToken)).statusCode).toBe(429)

    vi.setSystemTime(new Date('2030-05-01T12:15:01Z'))
    expect((await meAs(freshToken)).statusCode).toBe(200)
  })

  describe('tentativas sem autenticação válida contam no IP (60 por 15 minutos)', () => {
    it('60 chamadas sem token dão 401 e a 61ª dá 429', async () => {
      const statuses = await repeat(60, () => get(ME, IP_A))
      expect(allEqual(statuses, 401)).toBe(true)

      const blocked = await get(ME, IP_A)
      expectTooMany(blocked, /^Muitas requisições\. Tente novamente em/, 900)
    })

    it('token inválido, expirado ou de formato errado contam do mesmo jeito', async () => {
      for (let i = 0; i < 20; i++) await get(ME, IP_A)
      for (let i = 0; i < 20; i++) await get(ME, IP_A, bearer('abc.def.ghi'))
      for (let i = 0; i < 20; i++) await get(ME, IP_A, { authorization: 'Basic abc' })
      expect((await get(ME, IP_A)).statusCode).toBe(429)
    })

    it('mesmo com o IP esgotado pelas falhas, quem tem token VÁLIDO continua entrando', async () => {
      await repeat(61, () => get(ME, IP_A))
      expect((await get(ME, IP_A)).statusCode).toBe(429)
      expect((await meAs(tokenA, IP_A)).statusCode).toBe(200)
    })

    it('as falhas de um IP não afetam outro IP', async () => {
      await repeat(61, () => get(ME, IP_A))
      expect((await get(ME, IP_B)).statusCode).toBe(401)
    })

    it('no PUT do perfil sem token também vale (401 e depois 429)', async () => {
      const statuses = await repeat(60, () => app.inject({ method: 'PUT', url: PROFILE, remoteAddress: IP_A, payload: { age: 30 } }))
      expect(allEqual(statuses, 401)).toBe(true)
      const blocked = await app.inject({ method: 'PUT', url: PROFILE, remoteAddress: IP_A, payload: { age: 30 } })
      expect(blocked.statusCode).toBe(429)
    })

    it('as falhas compartilham o contador PÚBLICO do IP? Não: têm o próprio contador', async () => {
      await repeat(60, () => get(NOT_FOUND, IP_A))
      expect((await get(ME, IP_A)).statusCode).toBe(401)
    })
  })

  it('o aviso de bloqueio do usuário vai para o log sem o token', async () => {
    const capture = createLogCapture()
    const logged = await createTestApp({ logStream: capture.stream })
    try {
      for (let i = 0; i < 301; i++) {
        await logged.inject({ method: 'GET', url: ME, remoteAddress: IP_A, headers: bearer(tokenA) })
      }
      const logs = capture.text()
      expect(logs).toContain('"rateLimit":"authenticated"')
      expect(logs).toContain(userA.id)
      expect(logs).not.toContain(tokenA)
    } finally {
      await logged.close()
    }
  })
})