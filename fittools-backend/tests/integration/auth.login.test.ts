import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../src/database/client'
import { DUMMY_PASSWORD_HASH, authService } from '../../src/services/auth.service'
import { verifyJWT } from '../../src/utils/jwt.util'
import { createLogCapture, createTestApp, createUser, jsonOf, resetDatabase } from './helpers'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const EMAIL = 'maria@example.com'
const PASSWORD = 'Senha1234'
const LOGIN_URL = '/api/v1/auth/login'
const INVALID = { error: 'UnauthorizedError', message: 'Credenciais inválidas' }

interface ErrorBody {
  error: string
  message: string
  fields?: Record<string, string>
}

interface LoginBody {
  user: { id: string; email: string; name: string; created_at: string }
  token: string
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

describe('POST /api/v1/auth/login', () => {
  let app: TestApp
  let userId: string
  let storedHash: string

  const login = (payload: unknown) => app.inject({ method: 'POST', url: LOGIN_URL, payload: payload as object })

  // O login não altera o banco: o usuário é criado uma vez só (cada hash leva ~300 ms)
  beforeAll(async () => {
    app = await createTestApp()
    await resetDatabase()
    const user = await createUser({ email: EMAIL, password: PASSWORD, name: 'Maria da Silva' })
    userId = user.id
    storedHash = user.password_hash
  })

  afterAll(async () => {
    await resetDatabase()
    await app.close()
    await prisma.$disconnect()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sucesso', () => {
    it('devolve 200 com o usuário e o token, e nada além disso', async () => {
      const response = await login({ email: EMAIL, password: PASSWORD })
      expect(response.statusCode).toBe(200)

      const body = jsonOf<LoginBody>(response)
      expect(Object.keys(body).sort()).toEqual(['token', 'user'])
      expect(Object.keys(body.user).sort()).toEqual(['created_at', 'email', 'id', 'name'])
      expect(body.user).toMatchObject({ id: userId, email: EMAIL, name: 'Maria da Silva' })
      expect(new Date(body.user.created_at).toISOString()).toBe(body.user.created_at)
    })

    it('a resposta nunca contém a senha nem o hash', async () => {
      const response = await login({ email: EMAIL, password: PASSWORD })
      expect(response.body).not.toContain(PASSWORD)
      expect(response.body).not.toContain(storedHash)
      expect(response.body).not.toMatch(/password|\$2[aby]\$/i)
    })

    it('o token é um JWT válido do usuário, com validade de 7 dias', async () => {
      const before = Math.floor(Date.now() / 1000)
      const { token } = jsonOf<LoginBody>(await login({ email: EMAIL, password: PASSWORD }))
      const payload = verifyJWT(token)
      expect(payload.user_id).toBe(userId)
      expect(payload.email).toBe(EMAIL)
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60)
      expect(payload.iat).toBeGreaterThanOrEqual(before - 1)
    })

    it('responde em JSON e proíbe cache', async () => {
      const response = await login({ email: EMAIL, password: PASSWORD })
      expect(response.headers['content-type']).toMatch(/^application\/json/)
      expect(response.headers['cache-control']).toBe('no-store')
    })

    it.each(['MARIA@EXAMPLE.COM', '  Maria@Example.com  ', '\tmaria@example.com\n'])('aceita o email digitado como %j', async (email) => {
      expect((await login({ email, password: PASSWORD })).statusCode).toBe(200)
    })

    it('a mesma senha com acento digitada decomposta (a + til) entra', async () => {
      const composed = 'Sen\u00E3o1234'
      const user = await createUser({ email: 'acento@example.com', password: composed })
      try {
        const response = await login({ email: 'acento@example.com', password: 'Sena\u0303o1234' })
        expect(response.statusCode).toBe(200)
        expect(jsonOf<LoginBody>(response).user.id).toBe(user.id)
      } finally {
        await prisma.user.delete({ where: { id: user.id } })
      }
    })

    it('ignora campos extras no corpo', async () => {
      expect((await login({ email: EMAIL, password: PASSWORD, role: 'admin', id: 'x' })).statusCode).toBe(200)
    })
  })

  describe('credenciais inválidas (401)', () => {
    it('senha errada devolve 401 com a mensagem do design, sem token', async () => {
      const response = await login({ email: EMAIL, password: 'SenhaErrada99' })
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual(INVALID)
      expect(response.body).not.toContain('token')
    })

    it('email que não existe devolve exatamente a MESMA resposta', async () => {
      const wrongPassword = await login({ email: EMAIL, password: 'SenhaErrada99' })
      const unknownEmail = await login({ email: 'ninguem@example.com', password: PASSWORD })

      expect(unknownEmail.statusCode).toBe(wrongPassword.statusCode)
      expect(unknownEmail.body).toBe(wrongPassword.body)
      expect(unknownEmail.headers['content-type']).toBe(wrongPassword.headers['content-type'])
      expect(unknownEmail.headers['content-length']).toBe(wrongPassword.headers['content-length'])
      expect(jsonOf<ErrorBody>(unknownEmail)).toEqual(INVALID)
    })

    it.each([
      ['maiúscula trocada', 'senha1234'],
      ['espaço no fim', 'Senha1234 '],
      ['só o começo', 'Senha123'],
      ['a senha com algo a mais', 'Senha12345']
    ])('senha %s é rejeitada', async (_nome, password) => {
      const response = await login({ email: EMAIL, password })
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual(INVALID)
    })

    it('o hash guardado no banco não serve como senha', async () => {
      const response = await login({ email: EMAIL, password: storedHash })
      expect(response.statusCode).toBe(401)
    })

    it('senha com mais de 72 bytes é recusada com 401 (e não confundida com a senha original)', async () => {
      const base = 'A1' + 'a'.repeat(70)
      const user = await createUser({ email: 'longa@example.com', password: base })
      try {
        expect((await login({ email: 'longa@example.com', password: base })).statusCode).toBe(200)
        const response = await login({ email: 'longa@example.com', password: `${base}XYZ` })
        expect(response.statusCode).toBe(401)
        expect(jsonOf<ErrorBody>(response)).toEqual(INVALID)
      } finally {
        await prisma.user.delete({ where: { id: user.id } })
      }
    })

    it('tentativas de injeção de SQL só falham', async () => {
      expect((await login({ email: EMAIL, password: "' OR '1'='1" })).statusCode).toBe(401)
      const injectedEmail = await login({ email: "' OR 1=1 --", password: PASSWORD })
      expect(injectedEmail.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(injectedEmail).fields).toEqual({ email: 'Email inválido' })
    })

    it('usuário com hash corrompido no banco devolve 401, não 500', async () => {
      const user = await createUser({ email: 'quebrado@example.com', passwordHash: 'isto-nao-e-um-hash' })
      try {
        const response = await login({ email: 'quebrado@example.com', password: PASSWORD })
        expect(response.statusCode).toBe(401)
        expect(jsonOf<ErrorBody>(response)).toEqual(INVALID)
      } finally {
        await prisma.user.delete({ where: { id: user.id } })
      }
    })
  })

  describe('tempo de resposta constante', () => {
    it('com email inexistente ainda roda UMA verificação bcrypt, contra o hash de referência', async () => {
      const spy = vi.spyOn(authService, 'verifyPassword')
      const response = await login({ email: 'ninguem@example.com', password: PASSWORD })
      expect(response.statusCode).toBe(401)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(PASSWORD, DUMMY_PASSWORD_HASH)
    })

    it('com email existente e senha errada roda UMA verificação, contra o hash do usuário', async () => {
      const spy = vi.spyOn(authService, 'verifyPassword')
      await login({ email: EMAIL, password: 'SenhaErrada99' })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('SenhaErrada99', storedHash)
    })

    it('os dois casos levam o tempo de um bcrypt cost 12 (mediana ≥ 100 ms); o email inexistente não responde rápido', async () => {
      const known: number[] = []
      const unknown: number[] = []
      for (let i = 0; i < 5; i++) {
        let start = performance.now()
        await login({ email: EMAIL, password: 'SenhaErrada99' })
        known.push(performance.now() - start)

        start = performance.now()
        await login({ email: `ninguem${i}@example.com`, password: 'SenhaErrada99' })
        unknown.push(performance.now() - start)
      }
      expect(median(known)).toBeGreaterThanOrEqual(100)
      expect(median(unknown)).toBeGreaterThanOrEqual(100)
    })
  })

  describe('validação (400)', () => {
    it('email inválido e senha ausente apontam cada campo e não consultam o bcrypt', async () => {
      const spy = vi.spyOn(authService, 'verifyPassword')
      const response = await login({ email: 'abc' })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'ValidationError',
        message: 'Dados inválidos',
        fields: { email: 'Email inválido', password: 'Informe a senha' }
      })
      expect(spy).not.toHaveBeenCalled()
    })

    it('senha vazia devolve 400', async () => {
      const response = await login({ email: EMAIL, password: '' })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response).fields).toEqual({ password: 'Informe a senha' })
    })

    it('objeto vazio, sem corpo e JSON quebrado devolvem 400 em português', async () => {
      expect((await login({})).statusCode).toBe(400)

      const noBody = await app.inject({ method: 'POST', url: LOGIN_URL })
      expect(noBody.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(noBody).message).toBe('Corpo da requisição ausente')

      const broken = await app.inject({
        method: 'POST',
        url: LOGIN_URL,
        headers: { 'content-type': 'application/json' },
        payload: '{"email": '
      })
      expect(broken.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(broken).error).toBe('BadRequest')
    })

    it('GET no endpoint de login devolve 404', async () => {
      expect((await app.inject({ method: 'GET', url: LOGIN_URL })).statusCode).toBe(404)
    })
  })

  describe('erros do servidor e logs', () => {
    it('falha inesperada devolve 500 genérico, sem vazar o erro', async () => {
      vi.spyOn(authService, 'verifyPassword').mockRejectedValue(new Error('detalhe interno secreto'))
      const response = await login({ email: EMAIL, password: PASSWORD })
      expect(response.statusCode).toBe(500)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'InternalServerError', message: 'Erro interno do servidor' })
      expect(response.body).not.toContain('secreto')
    })

    it('não grava senha, hash, token nem Authorization nos logs (sucesso e falha)', async () => {
      const capture = createLogCapture()
      const logged = await createTestApp({ logStream: capture.stream })
      try {
        const ok = await logged.inject({
          method: 'POST',
          url: LOGIN_URL,
          headers: { authorization: 'Bearer token-de-outra-sessao-abc' },
          payload: { email: EMAIL, password: PASSWORD }
        })
        const bad = await logged.inject({
          method: 'POST',
          url: LOGIN_URL,
          payload: { email: EMAIL, password: 'SenhaErrada-Unica-77' }
        })
        expect(ok.statusCode).toBe(200)
        expect(bad.statusCode).toBe(401)

        const { token } = jsonOf<LoginBody>(ok)
        const logs = capture.text()
        expect(logs.length).toBeGreaterThan(0)
        expect(logs).not.toContain(PASSWORD)
        expect(logs).not.toContain('SenhaErrada-Unica-77')
        expect(logs).not.toContain(storedHash)
        expect(logs).not.toContain('$2b$')
        expect(logs).not.toContain(token)
        expect(logs).not.toContain('token-de-outra-sessao-abc')
      } finally {
        await logged.close()
      }
    })
  })

  describe('cadastro seguido de login', () => {
    it('quem se cadastra pela API consegue entrar com a mesma senha', async () => {
      const credentials = { email: 'novo@example.com', password: 'Sênha-Nova-2024', name: 'Novo Usuário' }
      const registered = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: credentials })
      expect(registered.statusCode).toBe(201)
      try {
        const response = await login({ email: credentials.email, password: credentials.password })
        expect(response.statusCode).toBe(200)
        expect(jsonOf<LoginBody>(response).user.id).toBe(jsonOf<LoginBody>(registered).user.id)
        expect((await login({ email: credentials.email, password: 'Sênha-Nova-2025' })).statusCode).toBe(401)
      } finally {
        await prisma.user.deleteMany({ where: { email: credentials.email } })
      }
    })
  })
})