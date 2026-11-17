import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '../../src/schemas/auth.schema'

const VALID = { email: 'maria@example.com', password: 'Senha1234', name: 'Maria da Silva' }

type Fields = Record<string, string[] | undefined>

function fail(schema: typeof registerSchema | typeof loginSchema, input: unknown) {
  const result = schema.safeParse(input)
  if (result.success) {
    throw new Error(`Esperava falha, mas passou: ${JSON.stringify(result.data)}`)
  }
  return {
    fields: result.error.flatten().fieldErrors as Fields,
    root: result.error.flatten().formErrors
  }
}

function register(overrides: Record<string, unknown>) {
  return registerSchema.safeParse({ ...VALID, ...overrides })
}

describe('registerSchema: dados válidos', () => {
  it('aceita e devolve os três campos', () => {
    expect(registerSchema.parse(VALID)).toEqual(VALID)
  })

  it('descarta campos desconhecidos (nada de id, role ou password_hash vindos do cliente)', () => {
    const data = registerSchema.parse({
      ...VALID,
      id: 'forjado',
      role: 'admin',
      is_admin: true,
      password_hash: '$2b$12$forjado',
      created_at: '2000-01-01'
    })
    expect(Object.keys(data).sort()).toEqual(['email', 'name', 'password'])
  })

  it('não altera o objeto recebido', () => {
    const input = { email: ' MARIA@Example.com ', password: 'Senha1234', name: '  Maria  ' }
    const copy = { ...input }
    registerSchema.parse(input)
    expect(input).toEqual(copy)
  })
})

describe('registerSchema: email', () => {
  it.each([
    [' Maria@Example.COM ', 'maria@example.com'],
    ['MARIA@EXAMPLE.COM', 'maria@example.com'],
    ['\tmaria@example.com\n', 'maria@example.com'],
    ['maria.silva+fit@sub.example.com.br', 'maria.silva+fit@sub.example.com.br']
  ])('normaliza %j para %j', (input, expected) => {
    const result = register({ email: input })
    expect(result.success && result.data.email).toBe(expected)
  })

  it.each([
    'abc',
    'maria@',
    '@example.com',
    'maria@example',
    'maria@@example.com',
    'maria silva@example.com',
    'maria@exa mple.com',
    'maria@example..com',
    '.maria@example.com',
    'mária@example.com',
    'maria@exämple.com',
    'maria@example.c'
  ])('rejeita %j com "Email inválido"', (email) => {
    expect(fail(registerSchema, { ...VALID, email }).fields.email).toEqual(['Email inválido'])
  })

  it('aceita exatamente 255 caracteres e rejeita 256', () => {
    const at255 = `${'a'.repeat(245)}@teste.com`
    const at256 = `${'a'.repeat(246)}@teste.com`
    expect(at255).toHaveLength(255)
    expect(register({ email: at255 }).success).toBe(true)
    expect(fail(registerSchema, { ...VALID, email: at256 }).fields.email).toContain(
      'Email deve ter no máximo 255 caracteres'
    )
  })

  it('pede o email quando vazio, só com espaços ou ausente', () => {
    expect(fail(registerSchema, { ...VALID, email: '' }).fields.email?.[0]).toBe('Informe o email')
    expect(fail(registerSchema, { ...VALID, email: '   ' }).fields.email?.[0]).toBe('Informe o email')
    const { email: _omitido, ...semEmail } = VALID
    expect(fail(registerSchema, semEmail).fields.email).toEqual(['Informe o email'])
  })

  it.each([123, null, true, ['a@b.com'], { a: 1 }])('rejeita email que não é texto: %j', (email) => {
    expect(fail(registerSchema, { ...VALID, email }).fields.email?.length).toBeGreaterThan(0)
  })
})

describe('registerSchema: senha', () => {
  it('aceita 8 caracteres com maiúscula, minúscula e número', () => {
    expect(register({ password: 'Abcdef12' }).success).toBe(true)
  })

  it('rejeita 7 caracteres com a mensagem de tamanho mínimo', () => {
    const { fields } = fail(registerSchema, { ...VALID, password: 'Abcde12' })
    expect(fields.password).toEqual(['Senha deve ter pelo menos 8 caracteres'])
  })

  it.each([
    ['sem maiúscula', 'senha1234'],
    ['sem minúscula', 'SENHA1234'],
    ['sem número', 'SenhaSenha'],
    ['só números', '12345678'],
    ['só espaços', '        ']
  ])('rejeita senha %s com a mensagem de composição', (_nome, password) => {
    expect(fail(registerSchema, { ...VALID, password }).fields.password).toContain(
      'Senha deve conter letras maiúsculas, minúsculas e números'
    )
  })

  it('aceita acentos como maiúscula e minúscula (Ç e ã contam)', () => {
    expect(register({ password: 'ÇÃO-ãõ-2024' }).success).toBe(true)
  })

  it('conta caracteres e não unidades do JavaScript: 7 emojis-letra falham, 8 passam', () => {
    // 3 + 5 = 8 caracteres (cada emoji é 1), mas 13 unidades UTF-16
    expect(register({ password: 'Ab1😀😀😀😀😀' }).success).toBe(true)
    // 3 + 4 = 7 caracteres, 11 unidades UTF-16
    expect(fail(registerSchema, { ...VALID, password: 'Ab1😀😀😀😀' }).fields.password).toEqual([
      'Senha deve ter pelo menos 8 caracteres'
    ])
  })

  it('aceita exatamente 72 bytes e rejeita 73', () => {
    const at72 = 'A1' + 'a'.repeat(70)
    expect(Buffer.byteLength(at72)).toBe(72)
    expect(register({ password: at72 }).success).toBe(true)
    expect(fail(registerSchema, { ...VALID, password: `${at72}a` }).fields.password).toEqual([
      'Senha muito longa: máximo de 72 bytes (cerca de 72 caracteres sem acentos)'
    ])
  })

  it('mede em bytes: "A1" + 35 letras "é" (72 bytes) passa e com 36 (74 bytes) falha', () => {
    expect(register({ password: 'A1' + 'é'.repeat(35) }).success).toBe(true)
    const password = 'A1' + 'é'.repeat(36)
    expect(password).toHaveLength(38)
    expect(fail(registerSchema, { ...VALID, password }).fields.password?.[0]).toMatch(/muito longa/)
  })

  it('não apara espaços da senha', () => {
    const result = register({ password: '  Senha1234  ' })
    expect(result.success && result.data.password).toBe('  Senha1234  ')
  })

  it('normaliza para NFC: "ã" decomposto (a + til) vira o "ã" inteiro', () => {
    const decomposed = 'Sena\u0303o1234'
    const composed = 'Sen\u00E3o1234'
    expect(decomposed).not.toBe(composed)
    const result = register({ password: decomposed })
    expect(result.success && result.data.password).toBe(composed)
  })

  it('pede a senha quando ausente e rejeita o que não é texto', () => {
    const { password: _omitida, ...semSenha } = VALID
    expect(fail(registerSchema, semSenha).fields.password).toEqual(['Informe a senha'])
    expect(fail(registerSchema, { ...VALID, password: 12345678 }).fields.password).toEqual(['Senha inválida'])
    expect(fail(registerSchema, { ...VALID, password: null }).fields.password).toEqual(['Senha inválida'])
  })
})

describe('registerSchema: nome', () => {
  it.each([
    ['João da Silva', 'João da Silva'],
    ["Maria D'Ávila", "Maria D'Ávila"],
    ['Maria D’Ávila', 'Maria D’Ávila'],
    ['Ana-Maria', 'Ana-Maria'],
    ['Zoë Łukasz', 'Zoë Łukasz'],
    ['李小龍', '李小龍'],
    ['Jo', 'Jo'],
    ['  Maria   da    Silva  ', 'Maria da Silva'],
    ['Ana\tSilva', 'Ana Silva'],
    ['Ana\nSilva', 'Ana Silva'],
    ['Jose\u0301 Silva', 'José Silva']
  ])('aceita %j e guarda como %j', (input, expected) => {
    const result = register({ name: input })
    expect(result.success && result.data.name).toBe(expected)
  })

  it('aceita exatamente 100 caracteres e rejeita 101', () => {
    expect(register({ name: 'a'.repeat(100) }).success).toBe(true)
    expect(fail(registerSchema, { ...VALID, name: 'a'.repeat(101) }).fields.name).toEqual([
      'Nome deve ter no máximo 100 caracteres'
    ])
  })

  it.each(['', ' ', '   ', 'A', ' A '])('rejeita %j por ser curto demais', (name) => {
    expect(fail(registerSchema, { ...VALID, name }).fields.name?.[0]).toBe('Nome deve ter pelo menos 2 caracteres')
  })

  it.each([
    'João123',
    'Maria<script>',
    'Ana_Maria',
    'Ana.Silva',
    'Ana@Silva',
    'Maria; DROP TABLE users',
    '-Ana',
    "'Ana",
    ' - ',
    'Jo\u200Bão',
    'Ana\u0000',
    'Ana\u202Eevil',
    'Ana 😀',
    'Ana×Silva',
    'Ana÷Silva'
  ])('rejeita o nome %j com a mensagem de caracteres inválidos', (name) => {
    expect(fail(registerSchema, { ...VALID, name }).fields.name).toContain(
      'Nome deve conter apenas letras, espaços, hífens e apóstrofos'
    )
  })

  it('pede o nome quando ausente e rejeita o que não é texto', () => {
    const { name: _omitido, ...semNome } = VALID
    expect(fail(registerSchema, semNome).fields.name).toEqual(['Informe o nome'])
    expect(fail(registerSchema, { ...VALID, name: 42 }).fields.name).toEqual(['Nome inválido'])
  })
})

describe('registerSchema: corpo da requisição e mensagens', () => {
  it.each([undefined, null, 'texto', 42, true, []])('rejeita corpo %j com mensagem em português', (body) => {
    const { root } = fail(registerSchema, body)
    expect(root).toHaveLength(1)
    expect(root[0]).toMatch(/^Corpo da requisição /)
  })

  it('objeto vazio reclama dos três campos', () => {
    const { fields } = fail(registerSchema, {})
    expect(Object.keys(fields).sort()).toEqual(['email', 'name', 'password'])
  })

  it('todas as mensagens de erro estão em português (nenhuma padrão do Zod em inglês)', () => {
    const inputs: unknown[] = [
      undefined,
      null,
      [],
      {},
      { email: 1, password: 2, name: 3 },
      { email: '', password: '', name: '' },
      { email: 'x', password: 'x', name: 'x' },
      { email: 'a'.repeat(300), password: 'a'.repeat(300), name: 'a'.repeat(300) },
      { email: null, password: null, name: null }
    ]
    const messages = inputs.flatMap((input) => {
      const { fields, root } = fail(registerSchema, input)
      return [...root, ...Object.values(fields).flatMap((list) => list ?? [])]
    })
    expect(messages.length).toBeGreaterThan(15)
    for (const message of messages) {
      expect(message).not.toMatch(/Required|Expected|Invalid|String must|received|at least|characters? long/i)
    }
  })
})

describe('loginSchema', () => {
  const LOGIN = { email: 'maria@example.com', password: 'qualquer coisa' }

  it('aceita email e senha e devolve só esses dois campos', () => {
    expect(loginSchema.parse({ ...LOGIN, name: 'Intruso', role: 'admin' })).toEqual(LOGIN)
  })

  it('normaliza o email como no cadastro', () => {
    const data = loginSchema.parse({ ...LOGIN, email: '  MARIA@Example.COM ' })
    expect(data.email).toBe('maria@example.com')
  })

  it('não aplica regras de formato à senha (quem confere é o hash)', () => {
    for (const password of ['a', 'abc', '12345678', 'x'.repeat(200)]) {
      expect(loginSchema.safeParse({ ...LOGIN, password }).success).toBe(true)
    }
  })

  it('não apara espaços da senha e normaliza para NFC', () => {
    expect(loginSchema.parse({ ...LOGIN, password: ' abc ' }).password).toBe(' abc ')
    expect(loginSchema.parse({ ...LOGIN, password: 'Sena\u0303o1234' }).password).toBe('Sen\u00E3o1234')
  })

  it('a mesma senha digitada decomposta no login e composta no cadastro gera o mesmo valor', () => {
    const registered = registerSchema.parse({ ...VALID, password: 'Sen\u00E3o1234' }).password
    const logged = loginSchema.parse({ email: VALID.email, password: 'Sena\u0303o1234' }).password
    expect(logged).toBe(registered)
  })

  it('exige a senha', () => {
    expect(fail(loginSchema, { ...LOGIN, password: '' }).fields.password).toEqual(['Informe a senha'])
    expect(fail(loginSchema, { email: LOGIN.email }).fields.password).toEqual(['Informe a senha'])
    expect(fail(loginSchema, { ...LOGIN, password: 123 }).fields.password).toEqual(['Senha inválida'])
  })

  it('exige um email válido', () => {
    expect(fail(loginSchema, { ...LOGIN, email: 'abc' }).fields.email).toEqual(['Email inválido'])
    expect(fail(loginSchema, { password: LOGIN.password }).fields.email).toEqual(['Informe o email'])
    expect(fail(loginSchema, { ...LOGIN, email: '' }).fields.email?.[0]).toBe('Informe o email')
  })

  it.each([undefined, null, 'texto', 42, []])('rejeita corpo %j com mensagem em português', (body) => {
    expect(fail(loginSchema, body).root[0]).toMatch(/^Corpo da requisição /)
  })
})