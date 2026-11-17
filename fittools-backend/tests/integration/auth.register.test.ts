import { Prisma } from '@prisma/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../src/database/client'
import { authService } from '../../src/services/auth.service'
import { verifyJWT } from '../../src/utils/jwt.util'
import { createLogCapture, createTestApp, jsonOf, resetDatabase } from './helpers'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const VALID = { email: 'maria@example.com', password: 'Senha1234', name: 'Maria da Silva' }
const URL = '/api/v1/auth/register'

interface ErrorBody {
  error: string
  message: string
  fields?: Record<string, string>
}

interface RegisterBody {
  user: { id: string; email: string; name: string; created_at: string }
  token: string
}

describe('POST /api/v1/auth/register', () => {
  let app: TestApp

  const register = (payload: unknown) => app.inject({ method: 'POST', url: URL, payload: payload as object })

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await resetDatabase()
    await app.close()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sucesso', () => {
    it('devolve 201 com o usuário e o token, e nada além disso', async () => {
      const response = await register(VALID)
      expect(response.statusCode).toBe(201)

      const body = jsonOf<RegisterBody>(response)
      expect(Object.keys(body).sort()).toEqual(['token', 'user'])
      expect(Object.keys(body.user).sort()).toEqual(['created_at', 'email', 'id', 'name'])
      expect(body.user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      expect(body.user.email).toBe('maria@example.com')
      expect(body.user.name).toBe('Maria da Silva')
      expect(new Date(body.user.created_at).toISOString()).toBe(body.user.created_at)
      expect(typeof body.token).toBe('string')
    })

    it('a resposta nunca contém a senha nem o hash', async () => {
      const response = await register({ ...VALID, password: 'Segredo-Unico-9876' })
      expect(response.body).not.toContain('Segredo-Unico-9876')
      expect(response.body).not.toMatch(/password|\$2[aby]\$/i)
    })

    it('o token é um JWT válido do usuário criado, com validade de 7 dias', async () => {
      const body = jsonOf<RegisterBody>(await register(VALID))
      const payload = verifyJWT(body.token)
      expect(payload.user_id).toBe(body.user.id)
      expect(payload.email).toBe('maria@example.com')
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60)
    })

    it('grava o usuário no banco com a senha em hash bcrypt cost 12', async () => {
      const body = jsonOf<RegisterBody>(await register(VALID))
      const row = await prisma.user.findUniqueOrThrow({ where: { id: body.user.id } })

      expect(row.email).toBe('maria@example.com')
      expect(row.name).toBe('Maria da Silva')
      expect(row.password_hash).toMatch(/^\$2b\$12\$/)
      expect(row.password_hash).not.toContain(VALID.password)
      expect(await authService.verifyPassword(VALID.password, row.password_hash)).toBe(true)
      expect(await authService.verifyPassword('SenhaErrada1', row.password_hash)).toBe(false)
      expect(await prisma.user.count()).toBe(1)
    })

    it('guarda o email em minúsculas e o nome sem espaços sobrando', async () => {
      const body = jsonOf<RegisterBody>(await register({ ...VALID, email: '  MARIA@Example.COM ', name: '  Maria   da  Silva ' }))
      expect(body.user.email).toBe('maria@example.com')
      expect(body.user.name).toBe('Maria da Silva')
      const row = await prisma.user.findUniqueOrThrow({ where: { id: body.user.id } })
      expect(row.email).toBe('maria@example.com')
    })

    it('responde em JSON e proíbe cache (a resposta tem um token)', async () => {
      const response = await register(VALID)
      expect(response.headers['content-type']).toMatch(/^application\/json/)
      expect(response.headers['cache-control']).toBe('no-store')
    })

    it('ignora campos que o cliente não deveria definir (id, hash, created_at)', async () => {
      const forgedId = '00000000-0000-4000-8000-000000000000'
      const body = jsonOf<RegisterBody>(
        await register({
          ...VALID,
          id: forgedId,
          password_hash: 'hash-forjado',
          role: 'admin',
          created_at: '2000-01-01T00:00:00.000Z'
        })
      )
      expect(body.user.id).not.toBe(forgedId)
      expect(body.user.created_at.startsWith('2000')).toBe(false)
      const row = await prisma.user.findUniqueOrThrow({ where: { id: body.user.id } })
      expect(row.password_hash).not.toBe('hash-forjado')
      expect(await authService.verifyPassword(VALID.password, row.password_hash)).toBe(true)
    })

    it('aceita acentos e apóstrofo no nome e emoji na senha', async () => {
      const response = await register({ ...VALID, name: "João D'Ávila-Çelik", password: 'Sênha-Forte-😀-1' })
      expect(response.statusCode).toBe(201)
      expect(jsonOf<RegisterBody>(response).user.name).toBe("João D'Ávila-Çelik")
    })
  })

  describe('email duplicado (409)', () => {
    it('devolve 409 ConflictError e não altera o usuário original', async () => {
      const first = jsonOf<RegisterBody>(await register(VALID))
      const before = await prisma.user.findUniqueOrThrow({ where: { id: first.user.id } })

      const response = await register({ ...VALID, password: 'OutraSenha99', name: 'Invasor' })
      expect(response.statusCode).toBe(409)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'ConflictError', message: 'Email já cadastrado' })
      expect(response.body).not.toContain('token')

      expect(await prisma.user.count()).toBe(1)
      const after = await prisma.user.findUniqueOrThrow({ where: { id: first.user.id } })
      expect(after.name).toBe('Maria da Silva')
      expect(after.password_hash).toBe(before.password_hash)
    })

    it.each(['MARIA@EXAMPLE.COM', ' Maria@Example.com ', 'maria@example.com'])(
      'também detecta o duplicado escrito como %j',
      async (email) => {
        await register(VALID)
        const response = await register({ ...VALID, email })
        expect(response.statusCode).toBe(409)
        expect(await prisma.user.count()).toBe(1)
      }
    )

    it('não gasta o bcrypt (~300 ms) com um email que já existe', async () => {
      await register(VALID)
      const spy = vi.spyOn(authService, 'hashPassword')
      const response = await register(VALID)
      expect(response.statusCode).toBe(409)
      expect(spy).not.toHaveBeenCalled()
    })

    it('cadastros simultâneos do mesmo email: um 201, o resto 409, nenhum 500', async () => {
      const responses = await Promise.all(Array.from({ length: 6 }, () => register(VALID)))
      const statuses = responses.map((r) => r.statusCode).sort()
      expect(statuses).toEqual([201, 409, 409, 409, 409, 409])
      expect(await prisma.user.count()).toBe(1)
    })

    it('emails diferentes não conflitam', async () => {
      expect((await register(VALID)).statusCode).toBe(201)
      expect((await register({ ...VALID, email: 'outra@example.com' })).statusCode).toBe(201)
      expect(await prisma.user.count()).toBe(2)
    })
  })

  describe('validação (400)', () => {
    it('devolve ValidationError com uma mensagem por campo e não cria nada', async () => {
      const response = await register({ email: 'abc', password: '123', name: 'A' })
      expect(response.statusCode).toBe(400)
      const body = jsonOf<ErrorBody>(response)
      expect(body.error).toBe('ValidationError')
      expect(body.message).toBe('Dados inválidos')
      expect(body.fields).toEqual({
        email: 'Email inválido',
        password: 'Senha deve ter pelo menos 8 caracteres',
        name: 'Nome deve ter pelo menos 2 caracteres'
      })
      expect(await prisma.user.count()).toBe(0)
    })

    it.each([
      ['curta (7 caracteres)', 'Abcde12', 'Senha deve ter pelo menos 8 caracteres'],
      ['sem maiúscula', 'senha1234', 'Senha deve conter letras maiúsculas, minúsculas e números'],
      ['sem minúscula', 'SENHA1234', 'Senha deve conter letras maiúsculas, minúsculas e números'],
      ['sem número', 'SenhaSenha', 'Senha deve conter letras maiúsculas, minúsculas e números'],
      ['com 73 bytes', 'A1' + 'a'.repeat(71), 'Senha muito longa: máximo de 72 bytes (cerca de 72 caracteres sem acentos)']
    ])('rejeita senha %s', async (_nome, password, message) => {
      const response = await register({ ...VALID, password })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response).fields).toEqual({ password: message })
      expect(await prisma.user.count()).toBe(0)
    })

    it.each([
      ['email com tipo errado', { email: 123 }, 'email'],
      ['nome com dígitos', { name: 'Maria 2' }, 'name'],
      ['nome com tag', { name: '<b>Maria</b>' }, 'name'],
      ['senha com tipo errado', { password: 12345678 }, 'password']
    ])('rejeita %s apontando o campo', async (_nome, override, field) => {
      const response = await register({ ...VALID, ...override })
      expect(response.statusCode).toBe(400)
      expect(Object.keys(jsonOf<ErrorBody>(response).fields ?? {})).toEqual([field])
    })

    it('objeto vazio reclama dos três campos', async () => {
      const response = await register({})
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response).fields).toEqual({
        email: 'Informe o email',
        password: 'Informe a senha',
        name: 'Informe o nome'
      })
    })

    it('sem corpo, devolve 400 em português', async () => {
      const response = await app.inject({ method: 'POST', url: URL })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response)).toMatchObject({
        error: 'ValidationError',
        message: 'Corpo da requisição ausente'
      })
    })

    it.each([['lista', '[]'], ['texto', '"abc"'], ['número', '42'], ['null', 'null']])(
      'corpo JSON que é %s devolve 400 ValidationError',
      async (_nome, raw) => {
        const response = await app.inject({
          method: 'POST',
          url: URL,
          headers: { 'content-type': 'application/json' },
          payload: raw
        })
        expect(response.statusCode).toBe(400)
        expect(jsonOf<ErrorBody>(response).error).toBe('ValidationError')
      }
    )
  })

  describe('requisições malformadas', () => {
    it('JSON quebrado devolve 400 BadRequest em português, sem detalhes do parser', async () => {
      const response = await app.inject({
        method: 'POST',
        url: URL,
        headers: { 'content-type': 'application/json' },
        payload: '{"email": "maria@example.com", "password": '
      })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'BadRequest',
        message: 'JSON malformado ou requisição inválida'
      })
      expect(response.body).not.toMatch(/Unexpected|position|JSON\.parse|FST_/)
    })

    it('Content-Type JSON com corpo vazio devolve 400 em português', async () => {
      const response = await app.inject({
        method: 'POST',
        url: URL,
        headers: { 'content-type': 'application/json' },
        payload: ''
      })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response).message).toBe('O corpo da requisição não pode estar vazio')
    })

    it('texto puro (text/plain) chega como string e é recusado pela validação (400)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: URL,
        headers: { 'content-type': 'text/plain' },
        payload: 'email=a'
      })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response).error).toBe('ValidationError')
      expect(await prisma.user.count()).toBe(0)
    })

    it.each(['application/x-www-form-urlencoded', 'application/xml'])('Content-Type %s devolve 415', async (contentType) => {
      const response = await app.inject({
        method: 'POST',
        url: URL,
        headers: { 'content-type': contentType },
        payload: 'email=a'
      })
      expect(response.statusCode).toBe(415)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'UnsupportedMediaType',
        message: 'Content-Type deve ser application/json'
      })
    })

    it('corpo acima de 1 MiB devolve 413 e não grava nada', async () => {
      const response = await app.inject({
        method: 'POST',
        url: URL,
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ ...VALID, name: 'a'.repeat(2 * 1024 * 1024) })
      })
      expect(response.statusCode).toBe(413)
      expect(jsonOf<ErrorBody>(response).error).toBe('PayloadTooLarge')
      expect(await prisma.user.count()).toBe(0)
    })
  })

  describe('erros do servidor (500)', () => {
    it('devolve mensagem genérica e não vaza o erro interno', async () => {
      vi.spyOn(authService, 'hashPassword').mockRejectedValue(new Error('falha interna com detalhe secreto xyz'))
      const response = await register(VALID)
      expect(response.statusCode).toBe(500)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'InternalServerError',
        message: 'Erro interno do servidor'
      })
      expect(response.body).not.toContain('secreto')
      expect(await prisma.user.count()).toBe(0)
    })

    it('erro do Prisma: 500 genérico e o hash que ele traz na mensagem não vai para o log', async () => {
      const capture = createLogCapture()
      const logged = await createTestApp({ logStream: capture.stream })
      try {
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Invalid `prisma.user.create()` invocation: data: { email: "maria@example.com", password_hash: "$2b$12$HASHFALSOQUENAODEVEVAZAR" }',
          { code: 'P2003', clientVersion: '5.22.0' }
        )
        vi.spyOn(authService, 'hashPassword').mockRejectedValue(prismaError)

        const response = await logged.inject({ method: 'POST', url: URL, payload: VALID })
        expect(response.statusCode).toBe(500)
        expect(response.body).not.toContain('HASHFALSO')
        expect(jsonOf<ErrorBody>(response).message).toBe('Erro interno do servidor')

        const logs = capture.text()
        expect(logs).toContain('P2003')
        expect(logs).not.toContain('HASHFALSO')
        expect(logs).not.toContain('password_hash')
      } finally {
        await logged.close()
      }
    })
  })

  describe('logs', () => {
    it('não grava a senha, o hash, o token nem o cabeçalho Authorization', async () => {
      const capture = createLogCapture()
      const logged = await createTestApp({ logStream: capture.stream })
      try {
        const response = await logged.inject({
          method: 'POST',
          url: URL,
          headers: { authorization: 'Bearer token-de-outra-sessao-abc' },
          payload: { ...VALID, password: 'Segredo-Unico-9876' }
        })
        expect(response.statusCode).toBe(201)

        const { token } = jsonOf<RegisterBody>(response)
        const row = await prisma.user.findUniqueOrThrow({ where: { email: VALID.email } })
        const logs = capture.text()

        expect(logs.length).toBeGreaterThan(0)
        expect(logs).not.toContain('Segredo-Unico-9876')
        expect(logs).not.toContain(row.password_hash)
        expect(logs).not.toContain('$2b$')
        expect(logs).not.toContain(token)
        expect(logs).not.toContain('token-de-outra-sessao-abc')
      } finally {
        await logged.close()
      }
    })
  })
})

describe('rotas inexistentes e ambiente de teste', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('rota desconhecida devolve 404 NotFound em português', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/nao-existe' })
    expect(response.statusCode).toBe(404)
    expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'NotFound', message: 'Recurso não encontrado' })
  })

  it('GET no endpoint de registro (só aceita POST) também devolve 404', async () => {
    expect((await app.inject({ method: 'GET', url: URL })).statusCode).toBe(404)
  })

  it('o /health continua funcionando', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(jsonOf<{ database: string }>(response).database).toBe('connected')
  })

  it('SEGURANÇA: a suíte roda no banco de teste e não no de desenvolvimento', async () => {
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`
    expect(rows[0].db).toBe('fittools_test')
  })
})