import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../src/config/env'
import {
  JwtError,
  JwtExpiredError,
  JwtInvalidError,
  signJWT,
  verifyJWT
} from '../../src/utils/jwt.util'

const USER_ID = '3f8c1b0e-7a52-4c5e-9f0a-1d2b3c4d5e6f'
const EMAIL = 'maria@example.com'
const SEVEN_DAYS = 7 * 24 * 60 * 60

function decodePart(token: string, index: 0 | 1): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[index], 'base64url').toString('utf8'))
}

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

describe('signJWT', () => {
  it('gera um token com três partes separadas por ponto', () => {
    expect(signJWT(USER_ID, EMAIL).split('.')).toHaveLength(3)
  })

  it('assina com HS256', () => {
    expect(decodePart(signJWT(USER_ID, EMAIL), 0)).toEqual({ alg: 'HS256', typ: 'JWT' })
  })

  it('inclui user_id, email, iat e exp, e nada além disso', () => {
    const payload = decodePart(signJWT(USER_ID, EMAIL), 1)
    expect(Object.keys(payload).sort()).toEqual(['email', 'exp', 'iat', 'user_id'])
    expect(payload.user_id).toBe(USER_ID)
    expect(payload.email).toBe(EMAIL)
  })

  it('expira 7 dias após a emissão (JWT_EXPIRATION_DAYS=7)', () => {
    const payload = decodePart(signJWT(USER_ID, EMAIL), 1) as { iat: number; exp: number }
    expect(payload.exp - payload.iat).toBe(SEVEN_DAYS)
  })

  it('usa o instante atual como iat', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z'))
    try {
      const payload = decodePart(signJWT(USER_ID, EMAIL), 1) as { iat: number }
      expect(payload.iat).toBe(Date.parse('2030-01-15T12:00:00Z') / 1000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('o token é assinado com o JWT_SECRET: outro segredo não valida', () => {
    const token = signJWT(USER_ID, EMAIL)
    expect(() => jwt.verify(token, 'outro-segredo-com-mais-de-trinta-e-dois-caracteres')).toThrow()
    expect(() => jwt.verify(token, env.JWT_SECRET)).not.toThrow()
  })
})

describe('signJWT com JWT_EXPIRATION_DAYS configurável', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each([1, 30])('com %i dia(s) o exp fica %i dia(s) após o iat', async (days) => {
    vi.stubEnv('JWT_EXPIRATION_DAYS', String(days))
    vi.resetModules()
    const fresh = await import('../../src/utils/jwt.util.js')
    const payload = decodePart(fresh.signJWT(USER_ID, EMAIL), 1) as { iat: number; exp: number }
    expect(payload.exp - payload.iat).toBe(days * 24 * 60 * 60)
  })
})

describe('verifyJWT: token válido', () => {
  it('devolve o conteúdo assinado (round-trip)', () => {
    const payload = verifyJWT(signJWT(USER_ID, EMAIL))
    expect(payload.user_id).toBe(USER_ID)
    expect(payload.email).toBe(EMAIL)
    expect(payload.exp - payload.iat).toBe(SEVEN_DAYS)
  })

  it('ainda vale 1 segundo antes de completar 7 dias', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z'))
    try {
      const token = signJWT(USER_ID, EMAIL)
      vi.setSystemTime(new Date('2030-01-15T12:00:00Z').getTime() + (SEVEN_DAYS - 1) * 1000)
      expect(verifyJWT(token).user_id).toBe(USER_ID)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('verifyJWT: token expirado', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('lança JwtExpiredError com a mensagem "Token expirado" após 7 dias', () => {
    const token = signJWT(USER_ID, EMAIL)
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z').getTime() + (SEVEN_DAYS + 1) * 1000)

    expect(() => verifyJWT(token)).toThrow(JwtExpiredError)
    expect(() => verifyJWT(token)).toThrow('Token expirado')
  })

  it('expirado não é tratado como inválido, e os dois são JwtError', () => {
    const token = signJWT(USER_ID, EMAIL)
    vi.setSystemTime(new Date('2030-01-15T12:00:00Z').getTime() + (SEVEN_DAYS + 1) * 1000)

    let error: unknown
    try {
      verifyJWT(token)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(JwtExpiredError)
    expect(error).not.toBeInstanceOf(JwtInvalidError)
    expect(error).toBeInstanceOf(JwtError)
    expect((error as Error).name).toBe('JwtExpiredError')
  })
})

describe('verifyJWT: token inválido', () => {
  function expectInvalid(token: string) {
    let error: unknown
    try {
      verifyJWT(token)
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(JwtInvalidError)
    expect(error).not.toBeInstanceOf(JwtExpiredError)
    expect(error).toBeInstanceOf(JwtError)
    expect((error as Error).message).toBe('Token inválido')
    expect((error as Error).name).toBe('JwtInvalidError')
  }

  it.each(['', 'abc', 'a.b', 'a.b.c', '....', 'Bearer abc.def.ghi'])('rejeita lixo: %j', (token) => {
    expectInvalid(token)
  })

  it('rejeita token assinado com outro segredo', () => {
    const forged = jwt.sign({ user_id: USER_ID, email: EMAIL }, 'outro-segredo-com-mais-de-trinta-e-dois-caracteres', {
      algorithm: 'HS256',
      expiresIn: 60
    })
    expectInvalid(forged)
  })

  it('rejeita token com o conteúdo alterado e a assinatura original', () => {
    const [header, , signature] = signJWT(USER_ID, EMAIL).split('.')
    const payload = decodePart(signJWT(USER_ID, EMAIL), 1)
    const tampered = `${header}.${encodePart({ ...payload, user_id: 'outro-usuario' })}.${signature}`
    expectInvalid(tampered)
  })

  it('rejeita token sem assinatura com alg "none"', () => {
    const now = Math.floor(Date.now() / 1000)
    const unsigned = `${encodePart({ alg: 'none', typ: 'JWT' })}.${encodePart({
      user_id: USER_ID,
      email: EMAIL,
      iat: now,
      exp: now + 600
    })}.`
    expectInvalid(unsigned)
  })

  it.each(['HS384', 'HS512'] as const)('rejeita token %s mesmo com o segredo correto', (algorithm) => {
    const token = jwt.sign({ user_id: USER_ID, email: EMAIL }, env.JWT_SECRET, { algorithm, expiresIn: 60 })
    expectInvalid(token)
  })

  it('rejeita token assinado sem prazo de validade (sem exp)', () => {
    const token = jwt.sign({ user_id: USER_ID, email: EMAIL }, env.JWT_SECRET, { algorithm: 'HS256' })
    expectInvalid(token)
  })

  it.each([
    ['sem user_id', { email: EMAIL }],
    ['sem email', { user_id: USER_ID }],
    ['user_id vazio', { user_id: '', email: EMAIL }],
    ['email vazio', { user_id: USER_ID, email: '' }],
    ['user_id numérico', { user_id: 123, email: EMAIL }],
    ['email numérico', { user_id: USER_ID, email: 123 }]
  ])('rejeita token com assinatura válida mas conteúdo inesperado: %s', (_nome, claims) => {
    const token = jwt.sign(claims, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: 60 })
    expectInvalid(token)
  })

  it('rejeita token cujo conteúdo é um texto e não um objeto', () => {
    const token = jwt.sign('so-um-texto', env.JWT_SECRET, { algorithm: 'HS256' })
    expectInvalid(token)
  })

  it('rejeita token que ainda não está valendo (nbf no futuro)', () => {
    const token = jwt.sign({ user_id: USER_ID, email: EMAIL }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: 3600,
      notBefore: 600
    })
    expectInvalid(token)
  })
})