import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../src/database/client'
import { userService } from '../../src/services/user.service'
import { signJWT } from '../../src/utils/jwt.util'
import { createLogCapture, createTestApp, createUser, jsonOf, resetDatabase } from './helpers'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const URL = '/api/v1/users/me/profile'
const FULL = {
  weight_kg: 82.5,
  height_cm: 178,
  age: 28,
  sex: 'male',
  activity_level: 'moderately_active',
  fitness_goal: 'muscle_gain'
}
const ALL_NULL = { weight_kg: null, height_cm: null, age: null, sex: null, activity_level: null, fitness_goal: null }
const RESPONSE_KEYS = ['activity_level', 'age', 'fitness_goal', 'height_cm', 'id', 'sex', 'updated_at', 'user_id', 'weight_kg']

interface ErrorBody {
  error: string
  message: string
  fields?: Record<string, string>
}

interface ProfileBody {
  health_profile: {
    id: string
    user_id: string
    weight_kg: number | null
    height_cm: number | null
    age: number | null
    sex: string | null
    activity_level: string | null
    fitness_goal: string | null
    updated_at: string
  }
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}

describe('PUT /api/v1/users/me/profile', () => {
  let app: TestApp
  let user: { id: string; email: string }
  let token: string

  // authToken null = requisição SEM token (passar undefined usaria o valor padrão)
  const put = (payload: unknown, authToken: string | null = token) =>
    app.inject({ method: 'PUT', url: URL, headers: authToken ? bearer(authToken) : {}, payload: payload as object })

  const rowOf = (userId: string) => prisma.userHealthProfile.findUnique({ where: { user_id: userId } })

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
    user = await createUser({ passwordHash: 'x' })
    token = signJWT(user.id, user.email)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('autenticação (401)', () => {
    it('sem token devolve 401 e não grava nada', async () => {
      const response = await put(FULL, null)
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response).error).toBe('UnauthorizedError')
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })

    it('token inválido e expirado também devolvem 401', async () => {
      expect((await put(FULL, 'abc.def.ghi')).statusCode).toBe(401)
      const forged = signJWT(user.id, user.email).replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
      expect((await put(FULL, forged)).statusCode).toBe(401)
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })

    it('a autenticação vem antes da validação e antes de ler o corpo: JSON quebrado sem token dá 401', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: URL,
        headers: { 'content-type': 'application/json' },
        payload: '{"weight_kg": '
      })
      expect(response.statusCode).toBe(401)
    })

    it('corpo inválido COM token válido dá 400 (e sem token, 401, sem revelar a validação)', async () => {
      expect((await put({ weight_kg: 5 })).statusCode).toBe(400)
      expect((await put({ weight_kg: 5 }, null)).statusCode).toBe(401)
    })
  })

  describe('criar o perfil (primeira vez)', () => {
    it('devolve 200 com o perfil, do usuário do token, com números de verdade', async () => {
      const response = await put(FULL)
      expect(response.statusCode).toBe(200)

      const { health_profile: hp } = jsonOf<ProfileBody>(response)
      expect(Object.keys(jsonOf<object>(response))).toEqual(['health_profile'])
      expect(Object.keys(hp).sort()).toEqual(RESPONSE_KEYS)
      expect(hp).toMatchObject({ user_id: user.id, ...FULL })
      expect(typeof hp.weight_kg).toBe('number')
      expect(new Date(hp.updated_at).toISOString()).toBe(hp.updated_at)
      expect(response.body).toContain('"weight_kg":82.5')
      expect(response.body).toContain('"height_cm":178')
      expect(response.headers['cache-control']).toBe('no-store')
    })

    it('grava uma linha no banco, ligada ao usuário', async () => {
      const { health_profile: hp } = jsonOf<ProfileBody>(await put(FULL))
      const row = await rowOf(user.id)
      expect(row).not.toBeNull()
      expect(row?.id).toBe(hp.id)
      expect(row?.weight_kg?.toNumber()).toBe(82.5)
      expect(row?.height_cm?.toNumber()).toBe(178)
      expect(row).toMatchObject({ age: 28, sex: 'male', activity_level: 'moderately_active', fitness_goal: 'muscle_gain' })
      expect(await prisma.userHealthProfile.count()).toBe(1)
    })

    it('aceita perfil parcial: só o peso', async () => {
      const { health_profile: hp } = jsonOf<ProfileBody>(await put({ weight_kg: 70 }))
      expect(hp).toMatchObject({ weight_kg: 70, height_cm: null, age: null, sex: null, activity_level: null, fitness_goal: null })
    })

    it.each([30, 300, 30.01, 299.99, 82.55])('guarda o peso %s sem arredondar', async (weight) => {
      const { health_profile: hp } = jsonOf<ProfileBody>(await put({ weight_kg: weight }))
      expect(hp.weight_kg).toBe(weight)
      expect((await rowOf(user.id))?.weight_kg?.toNumber()).toBe(weight)
    })

    it.each([120, 230, 120.01, 229.99, 178.5])('guarda a altura %s sem arredondar', async (height) => {
      expect(jsonOf<ProfileBody>(await put({ height_cm: height })).health_profile.height_cm).toBe(height)
    })

    it.each([14, 100])('aceita a idade %s (limite)', async (age) => {
      expect(jsonOf<ProfileBody>(await put({ age })).health_profile.age).toBe(age)
    })
  })

  describe('substituição completa (Requisito 5.6)', () => {
    it('um segundo PUT troca os valores, mantém o mesmo perfil e avança o updated_at', async () => {
      const first = jsonOf<ProfileBody>(await put(FULL)).health_profile
      await new Promise((resolve) => setTimeout(resolve, 15))
      const second = jsonOf<ProfileBody>(
        await put({ ...FULL, weight_kg: 79.9, age: 29, sex: 'female', activity_level: 'very_active', fitness_goal: 'weight_loss' })
      ).health_profile

      expect(second.id).toBe(first.id)
      expect(second).toMatchObject({ weight_kg: 79.9, age: 29, sex: 'female', activity_level: 'very_active', fitness_goal: 'weight_loss' })
      expect(Date.parse(second.updated_at)).toBeGreaterThan(Date.parse(first.updated_at))
      expect(await prisma.userHealthProfile.count()).toBe(1)
    })

    it('campo AUSENTE é apagado: depois de FULL, um PUT só com o peso deixa os outros cinco em null', async () => {
      await put(FULL)
      const { health_profile: hp } = jsonOf<ProfileBody>(await put({ weight_kg: 70 }))
      expect(hp).toMatchObject({ weight_kg: 70, height_cm: null, age: null, sex: null, activity_level: null, fitness_goal: null })

      const row = await rowOf(user.id)
      expect(row?.height_cm).toBeNull()
      expect(row?.age).toBeNull()
      expect(row?.sex).toBeNull()
      expect(row?.activity_level).toBeNull()
      expect(row?.fitness_goal).toBeNull()
    })

    it('campo null apaga só aquele campo quando os outros são enviados', async () => {
      await put(FULL)
      const { health_profile: hp } = jsonOf<ProfileBody>(await put({ ...FULL, age: null, sex: null }))
      expect(hp).toMatchObject({ weight_kg: 82.5, height_cm: 178, age: null, sex: null, activity_level: 'moderately_active' })
    })

    it('enviar os seis campos como null limpa o perfil de propósito (200, a linha continua)', async () => {
      const first = jsonOf<ProfileBody>(await put(FULL)).health_profile
      const response = await put(ALL_NULL)
      expect(response.statusCode).toBe(200)
      expect(jsonOf<ProfileBody>(response).health_profile).toMatchObject({ id: first.id, ...ALL_NULL })
    })

    it('o mesmo PUT repetido é idempotente: mesmo perfil, mesmos valores', async () => {
      const first = jsonOf<ProfileBody>(await put(FULL)).health_profile
      const second = jsonOf<ProfileBody>(await put(FULL)).health_profile
      expect(second).toMatchObject({ ...FULL, id: first.id, user_id: user.id })
      expect(await prisma.userHealthProfile.count()).toBe(1)
    })

    it('depois do PUT, o GET /users/me devolve exatamente o mesmo perfil', async () => {
      const { health_profile: saved } = jsonOf<ProfileBody>(await put(FULL))
      const me = await app.inject({ method: 'GET', url: '/api/v1/users/me', headers: bearer(token) })
      const { health_profile: read } = jsonOf<{ health_profile: ProfileBody['health_profile'] }>(me)
      const { user_id: _owner, ...savedWithoutOwner } = saved
      expect(read).toEqual(savedWithoutOwner)
    })
  })

  describe('corpo sem nenhum campo do perfil (400)', () => {
    it.each([
      ['objeto vazio', {}],
      ['só campos desconhecidos', { foo: 1, bar: 'x' }],
      ['só id e user_id forjados', { id: 'x', user_id: '00000000-0000-4000-8000-000000000000' }]
    ])('%s é recusado e NÃO apaga o perfil existente', async (_nome, body) => {
      const before = jsonOf<ProfileBody>(await put(FULL)).health_profile
      const response = await put(body)

      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'ValidationError',
        message: 'Informe pelo menos um campo do perfil',
        fields: {}
      })
      const row = await rowOf(user.id)
      expect(row?.id).toBe(before.id)
      expect(row?.weight_kg?.toNumber()).toBe(82.5)
      expect(row?.age).toBe(28)
    })

    it('{} sem perfil anterior também é 400 e não cria nada', async () => {
      expect((await put({})).statusCode).toBe(400)
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })
  })

  describe('validação (400)', () => {
    it.each([
      ['peso abaixo de 30', { weight_kg: 29.99 }, 'weight_kg', 'Peso deve estar entre 30 e 300 kg'],
      ['peso acima de 300', { weight_kg: 300.01 }, 'weight_kg', 'Peso deve estar entre 30 e 300 kg'],
      ['peso com 3 casas', { weight_kg: 82.555 }, 'weight_kg', 'Peso deve ter no máximo 2 casas decimais'],
      ['peso em texto', { weight_kg: '82.5' }, 'weight_kg', 'Peso deve ser um número'],
      ['altura abaixo de 120', { height_cm: 119.99 }, 'height_cm', 'Altura deve estar entre 120 e 230 cm'],
      ['altura acima de 230', { height_cm: 230.01 }, 'height_cm', 'Altura deve estar entre 120 e 230 cm'],
      ['idade abaixo de 14', { age: 13 }, 'age', 'Idade deve estar entre 14 e 100 anos'],
      ['idade acima de 100', { age: 101 }, 'age', 'Idade deve estar entre 14 e 100 anos'],
      ['idade quebrada', { age: 28.5 }, 'age', 'Idade deve ser um número inteiro'],
      ['sexo inválido', { sex: 'other' }, 'sex', "Sexo deve ser 'male' ou 'female'"],
      ['sexo com maiúscula', { sex: 'Male' }, 'sex', "Sexo deve ser 'male' ou 'female'"]
    ])('%s devolve 400 apontando o campo, e não grava nada', async (_nome, body, field, message) => {
      const response = await put(body)
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'ValidationError',
        message: 'Dados inválidos',
        fields: { [field]: message }
      })
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })

    it('nível de atividade e objetivo inválidos listam os valores aceitos', async () => {
      const response = await put({ activity_level: 'moderate', fitness_goal: 'hypertrophy' })
      const { fields } = jsonOf<ErrorBody>(response)
      expect(fields?.activity_level).toMatch(/^Nível de atividade inválido\. Valores aceitos: sedentary,/)
      expect(fields?.fitness_goal).toMatch(/^Objetivo inválido\. Valores aceitos: weight_loss,/)
    })

    it('vários campos inválidos de uma vez: uma mensagem por campo (exemplo do design)', async () => {
      const response = await put({ weight_kg: 5, sex: 'x' })
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'ValidationError',
        message: 'Dados inválidos',
        fields: { weight_kg: 'Peso deve estar entre 30 e 300 kg', sex: "Sexo deve ser 'male' ou 'female'" }
      })
    })

    it('um campo inválido junto de campos válidos recusa TUDO e o perfil anterior fica intacto', async () => {
      await put(FULL)
      const response = await put({ ...FULL, weight_kg: 5, age: 40 })
      expect(response.statusCode).toBe(400)
      const row = await rowOf(user.id)
      expect(row?.weight_kg?.toNumber()).toBe(82.5)
      expect(row?.age).toBe(28)
    })

    it.each([[[]], ['texto'], [42], [true]])('corpo JSON %j devolve 400 ValidationError', async (body) => {
      const response = await app.inject({
        method: 'PUT',
        url: URL,
        headers: { ...bearer(token), 'content-type': 'application/json' },
        payload: JSON.stringify(body)
      })
      expect(response.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(response).error).toBe('ValidationError')
    })

    it('JSON quebrado e corpo vazio devolvem 400 em português, sem detalhes do parser', async () => {
      const broken = await app.inject({
        method: 'PUT',
        url: URL,
        headers: { ...bearer(token), 'content-type': 'application/json' },
        payload: '{"weight_kg": '
      })
      expect(broken.statusCode).toBe(400)
      expect(jsonOf<ErrorBody>(broken)).toEqual({ error: 'BadRequest', message: 'JSON malformado ou requisição inválida' })

      const empty = await app.inject({ method: 'PUT', url: URL, headers: { ...bearer(token), 'content-type': 'application/json' }, payload: '' })
      expect(empty.statusCode).toBe(400)
    })

    it('Content-Type que não é JSON devolve 415 e corpo acima de 1 MiB devolve 413', async () => {
      const xml = await app.inject({ method: 'PUT', url: URL, headers: { ...bearer(token), 'content-type': 'application/xml' }, payload: '<a/>' })
      expect(xml.statusCode).toBe(415)
      const big = await app.inject({
        method: 'PUT',
        url: URL,
        headers: { ...bearer(token), 'content-type': 'application/json' },
        payload: JSON.stringify({ ...FULL, extra: 'a'.repeat(2 * 1024 * 1024) })
      })
      expect(big.statusCode).toBe(413)
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })
  })

  describe('segurança: cada usuário só altera o próprio perfil', () => {
    it('o user_id, o id e o updated_at enviados no corpo são ignorados', async () => {
      const other = await createUser({ email: 'outro@example.com', passwordHash: 'x' })
      const response = await put({ ...FULL, user_id: other.id, id: '00000000-0000-4000-8000-000000000000', updated_at: '2000-01-01T00:00:00.000Z' })

      expect(response.statusCode).toBe(200)
      const { health_profile: hp } = jsonOf<ProfileBody>(response)
      expect(hp.user_id).toBe(user.id)
      expect(hp.id).not.toBe('00000000-0000-4000-8000-000000000000')
      expect(hp.updated_at.startsWith('2000')).toBe(false)
      expect(await rowOf(other.id)).toBeNull()
      expect(await rowOf(user.id)).not.toBeNull()
    })

    it('o usuário A salvando não mexe no perfil do usuário B', async () => {
      const b = await createUser({ email: 'b@example.com', passwordHash: 'x' })
      const tokenB = signJWT(b.id, b.email)
      await put({ weight_kg: 95, age: 50 }, tokenB)
      const beforeB = await rowOf(b.id)

      await put({ weight_kg: 55, age: 20 })
      const afterB = await rowOf(b.id)
      expect(afterB?.weight_kg?.toNumber()).toBe(95)
      expect(afterB?.age).toBe(50)
      expect(afterB?.updated_at.getTime()).toBe(beforeB?.updated_at.getTime())
      expect((await rowOf(user.id))?.weight_kg?.toNumber()).toBe(55)
      expect(await prisma.userHealthProfile.count()).toBe(2)
    })

    it('id do outro usuário na URL ou na query não muda quem é alterado', async () => {
      const other = await createUser({ email: 'outro@example.com', passwordHash: 'x' })
      const response = await app.inject({
        method: 'PUT',
        url: `${URL}?user_id=${other.id}&id=${other.id}`,
        headers: { ...bearer(token), 'x-user-id': other.id },
        payload: FULL
      })
      expect(jsonOf<ProfileBody>(response).health_profile.user_id).toBe(user.id)
      expect(await rowOf(other.id)).toBeNull()
    })

    it('não existe rota para alterar o perfil de outro usuário pelo id (404)', async () => {
      const other = await createUser({ email: 'outro@example.com', passwordHash: 'x' })
      const response = await app.inject({ method: 'PUT', url: `/api/v1/users/${other.id}/profile`, headers: bearer(token), payload: FULL })
      expect(response.statusCode).toBe(404)
    })

    it('GET e POST em /users/me/profile não existem (404)', async () => {
      for (const method of ['GET', 'POST', 'DELETE', 'PATCH'] as const) {
        const response = await app.inject({ method, url: URL, headers: bearer(token), payload: method === 'GET' ? undefined : FULL })
        expect(response.statusCode).toBe(404)
      }
    })
  })

  describe('usuário apagado (404)', () => {
    it('token ainda válido de um usuário que não existe mais devolve 404 e não grava perfil órfão', async () => {
      await prisma.user.delete({ where: { id: user.id } })
      const response = await put(FULL)
      expect(response.statusCode).toBe(404)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'NotFound', message: 'Recurso não encontrado' })
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })

    it.each(['isto-nao-e-um-uuid', '123', '00000000-0000-4000-8000-00000000000g'])('id %j fora do formato UUID devolve 404, não 500', async (badId) => {
      const response = await put(FULL, signJWT(badId, 'x@example.com'))
      expect(response.statusCode).toBe(404)
      expect(response.body).not.toMatch(/prisma|uuid|SELECT|column/i)
    })

    it('apagar o usuário apaga o perfil junto (ON DELETE CASCADE)', async () => {
      await put(FULL)
      expect(await prisma.userHealthProfile.count()).toBe(1)
      await prisma.user.delete({ where: { id: user.id } })
      expect(await prisma.userHealthProfile.count()).toBe(0)
    })
  })

  describe('concorrência', () => {
    it('8 PUTs simultâneos de um usuário novo: todos 200, UMA só linha e um perfil inteiro de um deles', async () => {
      const payloads = Array.from({ length: 8 }, (_, i) => ({ weight_kg: 40 + i, age: 20 + i, height_cm: 150 + i }))
      const responses = await Promise.all(payloads.map((payload) => put(payload)))

      expect(responses.map((r) => r.statusCode)).toEqual(Array(8).fill(200))
      expect(await prisma.userHealthProfile.count()).toBe(1)

      const row = await rowOf(user.id)
      const index = (row?.weight_kg?.toNumber() ?? 0) - 40
      // peso, idade e altura têm de ser do MESMO pedido (nada de mistura entre pedidos)
      expect(row?.age).toBe(20 + index)
      expect(row?.height_cm?.toNumber()).toBe(150 + index)
    })

    it('PUTs simultâneos de 2 usuários não se misturam', async () => {
      const b = await createUser({ email: 'b@example.com', passwordHash: 'x' })
      const tokenB = signJWT(b.id, b.email)
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? put({ weight_kg: 60, age: 30 }) : put({ weight_kg: 90, age: 50 }, tokenB)))
      )
      expect((await rowOf(user.id))?.weight_kg?.toNumber()).toBe(60)
      expect((await rowOf(b.id))?.weight_kg?.toNumber()).toBe(90)
      expect(await prisma.userHealthProfile.count()).toBe(2)
    })
  })

  describe('erros do servidor, logs e CORS', () => {
    it('falha inesperada devolve 500 genérico e não vaza o erro', async () => {
      vi.spyOn(userService, 'replaceHealthProfile').mockRejectedValue(new Error('detalhe interno secreto'))
      const response = await put(FULL)
      expect(response.statusCode).toBe(500)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'InternalServerError', message: 'Erro interno do servidor' })
      expect(response.body).not.toContain('secreto')
    })

    it('não grava token nem dados de saúde nos logs', async () => {
      const capture = createLogCapture()
      const logged = await createTestApp({ logStream: capture.stream })
      try {
        const response = await logged.inject({ method: 'PUT', url: URL, headers: bearer(token), payload: { ...FULL, weight_kg: 77.77 } })
        expect(response.statusCode).toBe(200)
        const logs = capture.text()
        expect(logs.length).toBeGreaterThan(0)
        expect(logs).not.toContain(token)
        expect(logs).not.toContain('77.77')
        expect(logs).not.toContain('muscle_gain')
      } finally {
        await logged.close()
      }
    })

    it('o preflight CORS do PUT é aceito para o frontend e recusado para outra origem', async () => {
      const allowed = await app.inject({
        method: 'OPTIONS',
        url: URL,
        headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'authorization,content-type' }
      })
      expect(allowed.statusCode).toBe(204)
      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000')
      expect(String(allowed.headers['access-control-allow-methods'])).toContain('PUT')

      const denied = await app.inject({
        method: 'OPTIONS',
        url: URL,
        headers: { origin: 'https://evil.example', 'access-control-request-method': 'PUT' }
      })
      expect(denied.headers['access-control-allow-origin']).toBeUndefined()
    })
  })
})