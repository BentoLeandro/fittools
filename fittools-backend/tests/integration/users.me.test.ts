import jwt from 'jsonwebtoken'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../src/config/env'
import { prisma } from '../../src/database/client'
import { userService } from '../../src/services/user.service'
import { signJWT } from '../../src/utils/jwt.util'
import { createLogCapture, createTestApp, createUser, jsonOf, resetDatabase } from './helpers'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

const URL = '/api/v1/users/me'
const PROFILE_KEYS = ['activity_level', 'age', 'fitness_goal', 'height_cm', 'id', 'sex', 'updated_at', 'weight_kg']
const USER_KEYS = ['created_at', 'email', 'id', 'name', 'updated_at']

interface MeBody {
  user: { id: string; email: string; name: string; created_at: string; updated_at: string }
  health_profile: {
    id: string
    weight_kg: number | null
    height_cm: number | null
    age: number | null
    sex: string | null
    activity_level: string | null
    fitness_goal: string | null
    updated_at: string
  } | null
}

interface ErrorBody {
  error: string
  message: string
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}

describe('GET /api/v1/users/me', () => {
  let app: TestApp

  const me = (token?: string, extra: Record<string, string> = {}) =>
    app.inject({ method: 'GET', url: URL, headers: { ...(token ? bearer(token) : {}), ...extra } })

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

  describe('autenticação (401)', () => {
    it('sem token devolve 401 e nem chega a consultar o usuário', async () => {
      const spy = vi.spyOn(userService, 'getMe')
      const response = await me()
      expect(response.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(response)).toEqual({
        error: 'UnauthorizedError',
        message: 'Token de autenticação não fornecido'
      })
      expect(spy).not.toHaveBeenCalled()
    })

    it('token expirado, adulterado e com formato errado também devolvem 401', async () => {
      const user = await createUser({ passwordHash: 'x' })
      const past = Math.floor(Date.now() / 1000) - 60
      const expired = jwt.sign({ user_id: user.id, email: user.email, iat: past - 10, exp: past }, env.JWT_SECRET, { algorithm: 'HS256' })
      const forged = jwt.sign({ user_id: user.id, email: user.email }, 'outro-segredo-com-mais-de-trinta-e-dois-caracteres', { expiresIn: 600 })

      expect(jsonOf<ErrorBody>(await me(expired)).message).toBe('Token expirado')
      expect(jsonOf<ErrorBody>(await me(forged)).message).toBe('Token inválido')
      const malformed = await app.inject({ method: 'GET', url: URL, headers: { authorization: 'Basic abc' } })
      expect(malformed.statusCode).toBe(401)
      expect(jsonOf<ErrorBody>(malformed).message).toBe('Formato de token inválido')
    })
  })

  describe('usuário sem perfil de saúde', () => {
    it('devolve 200 com o usuário e health_profile null', async () => {
      const user = await createUser({ passwordHash: 'x', name: 'João Silva', email: 'joao@example.com' })
      const response = await me(signJWT(user.id, user.email))

      expect(response.statusCode).toBe(200)
      const body = jsonOf<MeBody>(response)
      expect(Object.keys(body).sort()).toEqual(['health_profile', 'user'])
      expect(Object.keys(body.user).sort()).toEqual(USER_KEYS)
      expect(body.user).toMatchObject({ id: user.id, email: 'joao@example.com', name: 'João Silva' })
      expect(new Date(body.user.created_at).toISOString()).toBe(body.user.created_at)
      expect(new Date(body.user.updated_at).toISOString()).toBe(body.user.updated_at)
      expect(body.health_profile).toBeNull()
    })
  })

  describe('usuário com perfil de saúde', () => {
    it('devolve o perfil completo com números de verdade (não texto)', async () => {
      const user = await createUser({ passwordHash: 'x' })
      const profile = await prisma.userHealthProfile.create({
        data: {
          user_id: user.id,
          weight_kg: 82.5,
          height_cm: 178,
          age: 28,
          sex: 'male',
          activity_level: 'moderately_active',
          fitness_goal: 'muscle_gain'
        }
      })

      const response = await me(signJWT(user.id, user.email))
      expect(response.statusCode).toBe(200)
      const { health_profile: hp } = jsonOf<MeBody>(response)

      expect(hp).not.toBeNull()
      expect(Object.keys(hp as object).sort()).toEqual(PROFILE_KEYS)
      expect(hp).toMatchObject({
        id: profile.id,
        weight_kg: 82.5,
        height_cm: 178,
        age: 28,
        sex: 'male',
        activity_level: 'moderately_active',
        fitness_goal: 'muscle_gain'
      })
      expect(typeof hp?.weight_kg).toBe('number')
      expect(typeof hp?.height_cm).toBe('number')
      expect(new Date(hp?.updated_at as string).toISOString()).toBe(hp?.updated_at)
      // o JSON cru traz número, não "82.5" entre aspas
      expect(response.body).toContain('"weight_kg":82.5')
      expect(response.body).toContain('"height_cm":178')
    })

    it.each([30.01, 299.99, 100.1, 45.07, 120, 300])('o peso %s sai do banco (DECIMAL) como o mesmo número', async (weight) => {
      const user = await createUser({ passwordHash: 'x' })
      await prisma.userHealthProfile.create({ data: { user_id: user.id, weight_kg: weight } })
      const { health_profile: hp } = jsonOf<MeBody>(await me(signJWT(user.id, user.email)))
      expect(hp?.weight_kg).toBe(weight)
    })

    it.each([120.01, 178.5, 199.99, 230])('a altura %s sai do banco (DECIMAL) como o mesmo número', async (height) => {
      const user = await createUser({ passwordHash: 'x' })
      await prisma.userHealthProfile.create({ data: { user_id: user.id, height_cm: height } })
      const { health_profile: hp } = jsonOf<MeBody>(await me(signJWT(user.id, user.email)))
      expect(hp?.height_cm).toBe(height)
    })

    it('perfil parcial: o que não foi preenchido vem null', async () => {
      const user = await createUser({ passwordHash: 'x' })
      await prisma.userHealthProfile.create({ data: { user_id: user.id, weight_kg: 70 } })
      const { health_profile: hp } = jsonOf<MeBody>(await me(signJWT(user.id, user.email)))
      expect(hp).toMatchObject({
        weight_kg: 70,
        height_cm: null,
        age: null,
        sex: null,
        activity_level: null,
        fitness_goal: null
      })
    })
  })

  describe('segurança e privacidade', () => {
    it('nunca expõe a senha nem o hash', async () => {
      const user = await createUser({ passwordHash: '$2b$12$HASHQUENAODEVEVAZARxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' })
      await prisma.userHealthProfile.create({ data: { user_id: user.id, weight_kg: 70 } })
      const response = await me(signJWT(user.id, user.email))
      expect(response.statusCode).toBe(200)
      expect(response.body).not.toMatch(/password|HASHQUENAODEVEVAZAR|\$2[aby]\$/i)
    })

    it('cada usuário só vê os próprios dados, mesmo com o outro id na URL, em cabeçalhos ou na query', async () => {
      const maria = await createUser({ email: 'maria@example.com', name: 'Maria', passwordHash: 'x' })
      const joao = await createUser({ email: 'joao@example.com', name: 'João', passwordHash: 'x' })
      await prisma.userHealthProfile.create({ data: { user_id: maria.id, weight_kg: 60, age: 30 } })
      await prisma.userHealthProfile.create({ data: { user_id: joao.id, weight_kg: 90, age: 40 } })

      const asMaria = await app.inject({
        method: 'GET',
        url: `${URL}?id=${joao.id}&user_id=${joao.id}`,
        headers: { ...bearer(signJWT(maria.id, maria.email)), 'x-user-id': joao.id }
      })
      const body = jsonOf<MeBody>(asMaria)
      expect(body.user.id).toBe(maria.id)
      expect(body.user.name).toBe('Maria')
      expect(body.health_profile).toMatchObject({ weight_kg: 60, age: 30 })
      expect(asMaria.body).not.toContain(joao.id)
      expect(asMaria.body).not.toContain('joao@example.com')
    })

    it('não existe rota para ler o usuário de outra pessoa pelo id (404)', async () => {
      const maria = await createUser({ passwordHash: 'x' })
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${maria.id}`,
        headers: bearer(signJWT(maria.id, maria.email))
      })
      expect(response.statusCode).toBe(404)
    })

    it('requisições simultâneas de 2 usuários veem cada uma os próprios dados', async () => {
      const a = await createUser({ email: 'a@example.com', name: 'Ana', passwordHash: 'x' })
      const b = await createUser({ email: 'b@example.com', name: 'Beto', passwordHash: 'x' })
      await prisma.userHealthProfile.create({ data: { user_id: a.id, weight_kg: 55, age: 25 } })
      await prisma.userHealthProfile.create({ data: { user_id: b.id, weight_kg: 95, age: 45 } })
      const tokens = { a: signJWT(a.id, a.email), b: signJWT(b.id, b.email) }

      const order = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 'a' : 'b') as 'a' | 'b')
      const responses = await Promise.all(order.map((who) => me(tokens[who])))
      responses.forEach((response, i) => {
        const body = jsonOf<MeBody>(response)
        expect(body.user.name).toBe(order[i] === 'a' ? 'Ana' : 'Beto')
        expect(body.health_profile?.weight_kg).toBe(order[i] === 'a' ? 55 : 95)
      })
    })

    it('proíbe cache (dados pessoais) e responde em JSON', async () => {
      const user = await createUser({ passwordHash: 'x' })
      const response = await me(signJWT(user.id, user.email))
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.headers['content-type']).toMatch(/^application\/json/)
    })

    it('não grava token nem dados pessoais nos logs', async () => {
      const capture = createLogCapture()
      const logged = await createTestApp({ logStream: capture.stream })
      try {
        const user = await createUser({ email: 'privado@example.com', passwordHash: '$2b$12$HASHNOLOGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' })
        await prisma.userHealthProfile.create({ data: { user_id: user.id, weight_kg: 77.7 } })
        const token = signJWT(user.id, user.email)
        const response = await logged.inject({ method: 'GET', url: URL, headers: bearer(token) })
        expect(response.statusCode).toBe(200)

        const logs = capture.text()
        expect(logs.length).toBeGreaterThan(0)
        expect(logs).not.toContain(token)
        expect(logs).not.toContain('HASHNOLOG')
        expect(logs).not.toContain('77.7')
      } finally {
        await logged.close()
      }
    })
  })

  describe('dados vêm do banco, não do token', () => {
    it('se o email mudou depois do login, a resposta traz o email atual', async () => {
      const user = await createUser({ email: 'antigo@example.com', passwordHash: 'x' })
      const oldToken = signJWT(user.id, 'antigo@example.com')
      await prisma.user.update({ where: { id: user.id }, data: { email: 'novo@example.com', name: 'Nome Novo' } })

      const body = jsonOf<MeBody>(await me(oldToken))
      expect(body.user.email).toBe('novo@example.com')
      expect(body.user.name).toBe('Nome Novo')
    })

    it('depois de salvar um perfil novo, a resposta reflete a mudança', async () => {
      const user = await createUser({ passwordHash: 'x' })
      const token = signJWT(user.id, user.email)
      expect(jsonOf<MeBody>(await me(token)).health_profile).toBeNull()

      await prisma.userHealthProfile.create({ data: { user_id: user.id, age: 33 } })
      expect(jsonOf<MeBody>(await me(token)).health_profile?.age).toBe(33)
    })
  })

  describe('usuário apagado (404)', () => {
    it('token ainda válido de um usuário que não existe mais devolve 404 NotFound', async () => {
      const user = await createUser({ passwordHash: 'x' })
      const token = signJWT(user.id, user.email)
      await prisma.user.delete({ where: { id: user.id } })

      const response = await me(token)
      expect(response.statusCode).toBe(404)
      expect(jsonOf<ErrorBody>(response)).toEqual({ error: 'NotFound', message: 'Recurso não encontrado' })
    })

    it('um token com um id que nunca existiu também devolve 404', async () => {
      const response = await me(signJWT('00000000-0000-4000-8000-000000000000', 'fantasma@example.com'))
      expect(response.statusCode).toBe(404)
    })

    it.each(['isto-nao-e-um-uuid', '123', "' OR 1=1 --", '00000000-0000-4000-8000-00000000000g'])('o id %j (fora do formato UUID) no token devolve 404, não 500', async (badId) => {
      const response = await me(signJWT(badId, 'x@example.com'))
      expect(response.statusCode).toBe(404)
      expect(response.body).not.toMatch(/prisma|uuid|SELECT|column/i)
    })
  })

  describe('método e desempenho', () => {
    it('POST, PUT e DELETE em /users/me não existem (404)', async () => {
      const user = await createUser({ passwordHash: 'x' })
      for (const method of ['POST', 'PUT', 'DELETE'] as const) {
        const response = await app.inject({ method, url: URL, headers: bearer(signJWT(user.id, user.email)) })
        expect(response.statusCode).toBe(404)
      }
    })

    it('responde em menos de 100 ms para 95% das requisições (100 chamadas seguidas)', async () => {
      const user = await createUser({ passwordHash: 'x' })
      await prisma.userHealthProfile.create({
        data: { user_id: user.id, weight_kg: 82.5, height_cm: 178, age: 28, sex: 'male', activity_level: 'moderately_active', fitness_goal: 'muscle_gain' }
      })
      const token = signJWT(user.id, user.email)
      await me(token) // aquece a conexão do Prisma

      const times: number[] = []
      for (let i = 0; i < 100; i++) {
        const start = performance.now()
        const response = await me(token)
        times.push(performance.now() - start)
        expect(response.statusCode).toBe(200)
      }
      times.sort((a, b) => a - b)
      const p95 = times[Math.floor(times.length * 0.95) - 1]
      expect(p95).toBeLessThan(100)
    })
  })
})