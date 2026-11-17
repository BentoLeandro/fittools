import bcrypt from 'bcrypt'
import { describe, expect, it } from 'vitest'
import {
  AuthService,
  BCRYPT_COST_FACTOR,
  DUMMY_PASSWORD_HASH,
  MAX_PASSWORD_BYTES,
  PasswordTooLongError,
  authService
} from '../../src/services/auth.service'

const PASSWORD = 'Senha1234'

describe('AuthService.hashPassword', () => {
  const service = new AuthService()

  it('gera um hash bcrypt de 60 caracteres no formato $2b$12$', async () => {
    const hash = await service.hashPassword(PASSWORD)
    expect(hash).toMatch(/^\$2b\$12\$[./A-Za-z0-9]{53}$/)
    expect(hash).toHaveLength(60)
  })

  it('usa cost factor 12', async () => {
    const hash = await service.hashPassword(PASSWORD)
    expect(BCRYPT_COST_FACTOR).toBe(12)
    expect(bcrypt.getRounds(hash)).toBe(12)
  })

  it('não contém a senha em texto plano', async () => {
    expect(await service.hashPassword(PASSWORD)).not.toContain(PASSWORD)
  })

  it('a mesma senha gera hashes diferentes (salt aleatório) e os dois verificam', async () => {
    const [first, second] = await Promise.all([service.hashPassword(PASSWORD), service.hashPassword(PASSWORD)])
    expect(first).not.toBe(second)
    // o salt são os 22 caracteres depois de "$2b$12$"
    expect(first.slice(7, 29)).not.toBe(second.slice(7, 29))
    expect(await service.verifyPassword(PASSWORD, first)).toBe(true)
    expect(await service.verifyPassword(PASSWORD, second)).toBe(true)
  })

  it('leva em torno de 300 ms (cost 12), não é instantâneo', async () => {
    const start = performance.now()
    await service.hashPassword(PASSWORD)
    const elapsed = performance.now() - start
    // limite inferior: com cost menor que 12 isto ficaria bem abaixo de 100 ms
    expect(elapsed).toBeGreaterThanOrEqual(100)
  })

  it('não trava o event loop enquanto calcula o hash', async () => {
    let ticks = 0
    const timer = setInterval(() => {
      ticks += 1
    }, 10)
    try {
      await service.hashPassword(PASSWORD)
    } finally {
      clearInterval(timer)
    }
    // com bcrypt síncrono o timer não rodaria nenhuma vez durante ~300 ms
    expect(ticks).toBeGreaterThanOrEqual(5)
  })

  it('aceita acentos e emojis', async () => {
    const password = 'Sênha-çãõ-😀-1A'
    const hash = await service.hashPassword(password)
    expect(await service.verifyPassword(password, hash)).toBe(true)
  })

  it('aceita senha de exatamente 72 bytes e recusa 73 bytes', async () => {
    const at = 'A1' + 'a'.repeat(MAX_PASSWORD_BYTES - 2)
    expect(Buffer.byteLength(at)).toBe(72)
    await expect(service.hashPassword(at)).resolves.toMatch(/^\$2b\$12\$/)

    await expect(service.hashPassword(at + 'a')).rejects.toBeInstanceOf(PasswordTooLongError)
    await expect(service.hashPassword(at + 'a')).rejects.toThrow('A senha excede o limite de 72 bytes')
  })

  it('conta bytes e não caracteres: 37 letras "é" (74 bytes) são recusadas', async () => {
    const password = 'é'.repeat(37)
    expect(password).toHaveLength(37)
    expect(Buffer.byteLength(password)).toBe(74)
    await expect(service.hashPassword(password)).rejects.toBeInstanceOf(PasswordTooLongError)
  })
})

describe('AuthService.verifyPassword', () => {
  const service = new AuthService()
  let hash: string

  it('devolve true para a senha correta', async () => {
    hash = await service.hashPassword(PASSWORD)
    expect(await service.verifyPassword(PASSWORD, hash)).toBe(true)
  })

  it.each([
    ['senha errada', 'Senha12345'],
    ['diferença só de maiúscula', 'senha1234'],
    ['com espaço no fim', 'Senha1234 '],
    ['prefixo da senha', 'Senha123'],
    ['vazia', '']
  ])('devolve false para %s', async (_nome, attempt) => {
    hash = await service.hashPassword(PASSWORD)
    expect(await service.verifyPassword(attempt, hash)).toBe(false)
  })

  it.each([
    ['vazio', ''],
    ['texto qualquer', 'abc'],
    ['a própria senha no lugar do hash', PASSWORD],
    ['hash truncado', '$2b$12$abcdefghijklmnopqrstuv'],
    ['cost inválido', '$2b$99$' + 'a'.repeat(53)]
  ])('devolve false, sem lançar erro, para hash malformado: %s', async (_nome, badHash) => {
    await expect(service.verifyPassword(PASSWORD, badHash)).resolves.toBe(false)
  })

  it('aceita hashes bcrypt gerados fora do serviço (compatibilidade)', async () => {
    const external = await bcrypt.hash(PASSWORD, 10)
    expect(await service.verifyPassword(PASSWORD, external)).toBe(true)
  })

  it('não confunde duas senhas que só diferem depois do byte 72', async () => {
    const base = 'A1' + 'a'.repeat(MAX_PASSWORD_BYTES - 2)
    const stored = await service.hashPassword(base)
    // sem a trava, o bcrypt compararia só os 72 primeiros bytes e devolveria true
    expect(await bcrypt.compare(base + 'X', stored)).toBe(true)
    expect(await service.verifyPassword(base + 'X', stored)).toBe(false)
    expect(await service.verifyPassword(base, stored)).toBe(true)
  })

  it('senha com byte nulo é tratada por inteiro, sem truncar', async () => {
    const stored = await service.hashPassword('Abc1\u0000segredo')
    expect(await service.verifyPassword('Abc1\u0000segredo', stored)).toBe(true)
    expect(await service.verifyPassword('Abc1\u0000outra', stored)).toBe(false)
    expect(await service.verifyPassword('Abc1', stored)).toBe(false)
  })
})

describe('authService (instância compartilhada)', () => {
  it('é uma instância de AuthService e funciona de ponta a ponta', async () => {
    expect(authService).toBeInstanceOf(AuthService)
    const hash = await authService.hashPassword(PASSWORD)
    expect(await authService.verifyPassword(PASSWORD, hash)).toBe(true)
  })
})

describe('DUMMY_PASSWORD_HASH (tempo constante no login)', () => {
  it('é um hash bcrypt válido com o mesmo custo das senhas reais', () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2b\$12\$[./A-Za-z0-9]{53}$/)
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_COST_FACTOR)
  })

  it('não aceita senha nenhuma conhecida e a verificação leva o tempo de um hash real', async () => {
    const service = new AuthService()
    const start = performance.now()
    expect(await service.verifyPassword(PASSWORD, DUMMY_PASSWORD_HASH)).toBe(false)
    expect(performance.now() - start).toBeGreaterThanOrEqual(100)
    expect(await service.verifyPassword('', DUMMY_PASSWORD_HASH)).toBe(false)
  })
})
