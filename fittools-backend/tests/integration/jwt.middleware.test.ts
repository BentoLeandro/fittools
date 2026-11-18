import jwt from 'jsonwebtoken'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { env } from '../../src/config/env'
import { prisma } from '../../src/database/client'
import { jwtMiddleware, requireUser } from '../../src/middlewares/jwt.middleware'
import { signJWT } from '../../src/utils/jwt.util'
import { createLogCapture, createTestApp, createUser, jsonOf, resetDatabase } from './helpers'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

interface ErrorBody {
  error: string
  message: string
}

interface UserBody {
  user: { id: string; email: string } | null
}

const MISSING = 'Token de autenticação não fornecido'
const MALFORMED = 'Formato de token inválido'
const EXPIRED = 'Token expirado'
const INVALID = 'Token inválido'

/** Rotas só para o teste: cada uma usa o middleware de um jeito (ou esquece de usá-lo). */
function registerTestRoutes(app: TestApp) {
  const whoAmI = async (request: Parameters<typeof requireUser>[0]) => ({ user: requireUser(request) })
  app.get('/__test/prehandler', { preHandler: jwtMiddleware }, whoAmI)
  app.post('/__test/prehandler', { preHandler: jwtMiddleware }, whoAmI)
  app.post('/__test/onrequest', { onRequest: jwtMiddleware }, whoAmI)
  // Esqueceu o middleware: requireUser precisa fechar a porta
  app.get('/__test/forgot', async (request) => whoAmI(request))
  // Rota pública: request.user existe e é null
  app.post('/__test/public', async (request) => ({ user: request.user }))
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}

function signWith(claims: Record<string, unknown>, options: jwt.SignOptions = {}, secret = env.JWT_SECRET) {
  return jwt.sign(claims, secret, { algorithm: 'HS256', ...options })
}

describe('jwtMiddleware', () => {
  let app: TestApp
  let maria: { id: string; email: string }
  let joao: { id: string; email: string }

  const get = (headers: Record<string, string> = {}, url = '/__test/prehandler') => app.inject({ method: 'GET', url, headers })

  beforeAll(async () => {
    app = await createTestApp({ configure: registerTestRoutes })
    await resetDatabase()
    maria = await createUser({ email: 'maria@example.com', passwordHash: 'hash-qualquer-1' })
    joao = await createUser({ email: 'joao@example.com', passwordHash: 'hash-qualquer-2' })
  })

  afterAll(async () => {
    await resetDatabase()
    await app.close()
    await prisma.$disconnect()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('token válido', () => {
    it('devolve 200 e preenche request.user com { id, email } e nada além disso', async () => {
      const response = await get(bearer(signJWT(maria.id, maria.email)))
      expect(response.statusCode).toBe(200)
      expect(jsonOf<UserBody>(response)).toEqual({ user: { id: maria.id, email: maria.email } })
    })

    it.each(['bearer', 'BEARER', 'Bearer'])('aceita o esquema "%s"', async (scheme) => {
      const response = await get({ authorization: `${scheme} ${signJWT(maria.id, maria.email)}` })
      expect(response.statusCode).toBe(200)
    })

    it('aceita vários espaços entre o esquema e o token', async () => {
      const response = await get({ authorization: `Bearer     ${signJWT(maria.id, maria.email)}` })
      expect(response.statusCode).toBe(200)
    })

    it('o mesmo token vale até o último segundo dos 7 dias', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2030-03-10T12:00:00Z'))
      const token = signJWT(maria.id, maria.email)

      vi.setSystemTime(new Date('2030-03-10T12:00:00Z').getTime() + (7 * 24 * 60 * 60 - 1) * 1000)
      expect((await get(bearer(token))).statusCode).toBe(200)

      vi.setSystemTime(new Date('2030-03-10T12:00:00Z').getTime() + (7 * 24 * 60 * 60 + 1) * 1000)
      const expired = await get(bearer(token))
      expect(expired.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(expired).message).toBe(EXPIRED)
    })

    it('funciona também como onRequest e em rotas POST', async () => {
      const token = signJWT(joao.id, joao.email)
      for (const url of ['/__test/prehandler', '/__test/onrequest']) {
        const response = await app.inject({ method: 'POST', url, headers: bearer(token), payload: { qualquer: 'coisa' } })
        expect(response.statusCode).toBe(200)
        expect(jsonOf<UserBody>(response).user).toEqual({ id: joao.id, email: joao.email })
      }
    })

    it('não consulta o banco (token vale até expirar, JWT sem estado)', async () => {
      const spy = vi.spyOn(prisma, '$queryRaw')
      const token = signJWT('00000000-0000-4000-8000-000000000000', 'fantasma@example.com')
      const response = await get(bearer(token))
      expect(response.statusCode).toBe(200)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('token ausente e formato inválido', () => {
    it('sem cabeçalho Authorization devolve 401 "não fornecido"', async () => {
      const response = await get()
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'UnauthorizedError', message: MISSING })
    })

    it('Authorization vazio também é "não fornecido"', async () => {
      const response = await get({ authorization: '' })
      expect(jsonOf<ErrorBody>(response).message).toBe(MISSING)
    })

    it.each([
      'Bearer',
      'Bearer ',
      'abc',
      'Basic dXNlcjpwYXNz',
      'Token abc.def.ghi',
      'Bearer abc def',
      'Bearer abc.def.ghi extra'
    ])('formato inválido %j devolve 401 "formato inválido"', async (authorization) => {
      const response = await get({ authorization })
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'UnauthorizedError', message: MALFORMED })
    })

    it('um token válido sem o esquema Bearer é recusado', async () => {
      const response = await get({ authorization: signJWT(maria.id, maria.email) })
      expect(jsonOf<ErrorBody>(response).message).toBe(MALFORMED)
    })
  })

  describe('token expirado e inválido', () => {
    it('expirado devolve 401 "Token expirado"', async () => {
      const past = Math.floor(Date.now() / 1000) - 60
      const token = signWith({ user_id: maria.id, email: maria.email, iat: past - 100, exp: past })
      const response = await get(bearer(token))
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'UnauthorizedError', message: EXPIRED })
    })

    it.each([
      ['lixo', 'abc.def.ghi'],
      ['sem pontos', 'umtokenqualquer'],
      ['assinado com outro segredo', signWith({ user_id: 'x', email: 'a@b.com' }, { expiresIn: 600 }, 'outro-segredo-com-mais-de-trinta-e-dois-caracteres')],
      ['HS512 com o segredo certo', jwt.sign({ user_id: 'x', email: 'a@b.com' }, env.JWT_SECRET, { algorithm: 'HS512', expiresIn: 600 })],
      ['sem exp', signWith({ user_id: 'x', email: 'a@b.com' })],
      ['sem user_id', signWith({ email: 'a@b.com' }, { expiresIn: 600 })],
      ['sem email', signWith({ user_id: 'x' }, { expiresIn: 600 })]
    ])('inválido (%s) devolve 401 "Token inválido"', async (_nome, token) => {
      const response = await get(bearer(token))
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'UnauthorizedError', message: INVALID })
    })

    it('token sem assinatura (alg none) é recusado', async () => {
      const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
      const now = Math.floor(Date.now() / 1000)
      const unsigned = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ user_id: maria.id, email: maria.email, iat: now, exp: now + 600 })}.`
      expect(jsonOf<ErrorBody>(await get(bearer(unsigned))).message).toBe(INVALID)
    })

    it('conteúdo adulterado com a assinatura original é recusado', async () => {
      const [header, , signature] = signJWT(maria.id, maria.email).split('.')
      const forged = Buffer.from(JSON.stringify({ user_id: joao.id, email: joao.email, iat: 1, exp: 9999999999 })).toString('base64url')
      expect(jsonOf<ErrorBody>(await get(bearer(`${header}.${forged}.${signature}`))).message).toBe(INVALID)
    })
  })

  describe('a resposta 401', () => {
    it('só tem { error, message }, nunca repete o token e pede esquema Bearer', async () => {
      const token = 'abc.def.ghi'
      const response = await get(bearer(token))
      expect(Object.keys(jsonOf<ErrorBody>(response)).sort()).toEqual(['error', 'message'])
      expect(response.body).not.toContain(token)
      expect(response.headers['www-authenticate']).toBe('Bearer')
    })

    it('também manda WWW-Authenticate quando o token não é enviado', async () => {
      expect((await get()).headers['www-authenticate']).toBe('Bearer')
    })
  })

  describe('request.user', () => {
    it('não vaza entre requisições: depois de uma autenticada, a próxima sem token é 401', async () => {
      expect((await get(bearer(signJWT(maria.id, maria.email)))).statusCode).toBe(200)
      expect((await get()).statusCode).toBe(401)
    })

    it('requisições simultâneas de usuários diferentes veem cada uma o seu próprio usuário', async () => {
      const tokens = { maria: signJWT(maria.id, maria.email), joao: signJWT(joao.id, joao.email) }
      const order = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 'maria' : 'joao') as 'maria' | 'joao')
      const responses = await Promise.all(order.map((who) => get(bearer(tokens[who]))))
      responses.forEach((response, i) => {
        const expected = order[i] === 'maria' ? maria : joao
        expect(jsonOf<UserBody>(response).user).toEqual({ id: expected.id, email: expected.email })
      })
    })

    it('o cliente não consegue definir o usuário pelo corpo, pela URL ou por cabeçalhos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/__test/public?user=${joao.id}&id=${joao.id}`,
        headers: { 'x-user-id': joao.id, 'x-user': JSON.stringify({ id: joao.id }) },
        payload: { user: { id: joao.id, email: joao.email }, user_id: joao.id }
      })
      expect(response.statusCode).toBe(200)
      expect(jsonOf<UserBody>(response).user).toBeNull()
    })

    it('rota que esqueceu o middleware responde 401 em vez de seguir sem dono', async () => {
      const response = await app.inject({ method: 'GET', url: '/__test/forgot' })
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response).error).toBe('UnauthorizedError')
    })

    it('mesmo enviando um token válido, uma rota SEM o middleware não identifica o usuário', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/__test/forgot',
        headers: bearer(signJWT(maria.id, maria.email))
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('onRequest x preHandler', () => {
    const brokenJson = { 'content-type': 'application/json' }

    it('como onRequest, recusa ANTES de ler o corpo: JSON quebrado sem token dá 401', async () => {
      const response = await app.inject({ method: 'POST', url: '/__test/onrequest', headers: brokenJson, payload: '{"a": ' })
      expect(response.statusCode).toBe(401)
    })

    it('como preHandler, o corpo é lido antes: JSON quebrado sem token dá 400', async () => {
      const response = await app.inject({ method: 'POST', url: '/__test/prehandler', headers: brokenJson, payload: '{"a": ' })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('logs', () => {
    it('registra o motivo da recusa e nunca o token', async () => {
      const capture = createLogCapture()
      const logged = await createTestApp({ logStream: capture.stream, configure: registerTestRoutes })
      try {
        const secretToken = 'SEGREDO-NO-TOKEN.abc.def'
        await logged.inject({ method: 'GET', url: '/__test/prehandler', headers: bearer(secretToken) })
        await logged.inject({ method: 'GET', url: '/__test/prehandler', headers: { authorization: 'Basic SEGREDO-BASIC' } })
        await logged.inject({ method: 'GET', url: '/__test/prehandler' })
        const expired = signWith({ user_id: 'x', email: 'a@b.com', iat: 1, exp: 2 })
        await logged.inject({ method: 'GET', url: '/__test/prehandler', headers: bearer(expired) })

        const logs = capture.text()
        for (const reason of ['invalid', 'malformed', 'missing', 'expired']) {
          expect(logs).toContain(`"authFailure":"${reason}"`)
        }
        expect(logs).not.toContain('SEGREDO-NO-TOKEN')
        expect(logs).not.toContain('SEGREDO-BASIC')
        expect(logs).not.toContain(expired)
        // token adulterado e formato estranho são "warn" (nível 40); ausente e expirado, "info" (30)
        const lines = logs.split('\n').filter((line) => line.includes('authFailure'))
        const levelOf = (reason: string) => JSON.parse(lines.find((l) => l.includes(`"${reason}"`)) as string).level
        expect(levelOf('invalid')).toBe(40)
        expect(levelOf('malformed')).toBe(40)
        expect(levelOf('missing')).toBe(30)
        expect(levelOf('expired')).toBe(30)
      } finally {
        await logged.close()
      }
    })
  })

  describe('com tokens emitidos pela própria API', () => {
    it('o token do cadastro e o do login abrem a rota protegida', async () => {
      const credentials = { email: 'fluxo@example.com', password: 'Senha-Fluxo-2024', name: 'Fluxo Completo' }
      const registered = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: credentials })
      expect(registered.statusCode).toBe(201)
      try {
        const { user, token } = jsonOf<{ user: { id: string; email: string }; token: string }>(registered)
        const withRegisterToken = await get(bearer(token))
        expect(jsonOf<UserBody>(withRegisterToken).user).toEqual({ id: user.id, email: credentials.email })

        const login = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: credentials.email, password: credentials.password }
        })
        const withLoginToken = await get(bearer(jsonOf<{ token: string }>(login).token))
        expect(jsonOf<UserBody>(withLoginToken).user).toEqual({ id: user.id, email: credentials.email })
      } finally {
        await prisma.user.deleteMany({ where: { email: credentials.email } })
      }
    })
  })
})