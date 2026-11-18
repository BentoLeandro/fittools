import { ActivityLevel, FitnessGoal, Sex } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { HEALTH_PROFILE_LIMITS, healthProfileReplaceSchema, healthProfileSchema } from '../../src/schemas/user.schema'
import { ValidationError } from '../../src/utils/errors.util'
import { parseOrThrow } from '../../src/utils/validation.util'

const FULL = {
  weight_kg: 82.5,
  height_cm: 178,
  age: 28,
  sex: 'male',
  activity_level: 'moderately_active',
  fitness_goal: 'muscle_gain'
}

type Fields = Record<string, string[] | undefined>

function errorsOf(input: unknown): Fields {
  const result = healthProfileSchema.safeParse(input)
  if (result.success) {
    throw new Error(`Esperava falha, mas passou: ${JSON.stringify(result.data)}`)
  }
  return result.error.flatten().fieldErrors as Fields
}

const accepts = (input: unknown) => healthProfileSchema.safeParse(input).success

describe('healthProfileSchema: dados válidos', () => {
  it('aceita o exemplo completo do design e devolve os mesmos valores', () => {
    expect(healthProfileSchema.parse(FULL)).toEqual(FULL)
  })

  it('o perfil pode ser parcial: objeto vazio e cada campo sozinho são aceitos', () => {
    expect(healthProfileSchema.parse({})).toEqual({})
    for (const [key, value] of Object.entries(FULL)) {
      expect(healthProfileSchema.parse({ [key]: value })).toEqual({ [key]: value })
    }
  })

  it('null vale como "sem valor" em qualquer campo (formulário com campo apagado)', () => {
    const allNull = Object.fromEntries(Object.keys(FULL).map((key) => [key, null]))
    expect(healthProfileSchema.parse(allNull)).toEqual(allNull)
  })

  it('descarta campos desconhecidos (id, user_id, updated_at, role)', () => {
    const data = healthProfileSchema.parse({
      ...FULL,
      id: 'forjado',
      user_id: '00000000-0000-4000-8000-000000000000',
      updated_at: '2000-01-01T00:00:00.000Z',
      role: 'admin'
    })
    expect(Object.keys(data).sort()).toEqual(Object.keys(FULL).sort())
  })

  it('não altera o objeto recebido', () => {
    const input = { ...FULL, user_id: 'x' }
    const copy = { ...input }
    healthProfileSchema.parse(input)
    expect(input).toEqual(copy)
  })
})

describe('healthProfileSchema: faixas numéricas', () => {
  it.each([
    ['weight_kg', 30, 300, 'Peso deve estar entre 30 e 300 kg'],
    ['height_cm', 120, 230, 'Altura deve estar entre 120 e 230 cm']
  ])('%s: aceita os limites %d e %d e recusa um centésimo fora', (field, min, max, message) => {
    expect(accepts({ [field]: min })).toBe(true)
    expect(accepts({ [field]: max })).toBe(true)
    expect(errorsOf({ [field]: min - 0.01 })[field]).toEqual([message])
    expect(errorsOf({ [field]: max + 0.01 })[field]).toEqual([message])
  })

  it.each([
    [0, 'zero'],
    [-1, 'negativo'],
    [29, 'abaixo'],
    [301, 'acima'],
    [1e6, 'enorme'],
    [Number.MAX_VALUE, 'maior número possível'],
    [Infinity, 'infinito'],
    [-Infinity, 'menos infinito']
  ])('peso %s (%s) é recusado pela faixa', (weight) => {
    expect(errorsOf({ weight_kg: weight }).weight_kg?.[0]).toBe('Peso deve estar entre 30 e 300 kg')
  })

  it('idade: aceita 14 e 100, recusa 13 e 101', () => {
    expect(accepts({ age: 14 })).toBe(true)
    expect(accepts({ age: 100 })).toBe(true)
    expect(errorsOf({ age: 13 }).age).toEqual(['Idade deve estar entre 14 e 100 anos'])
    expect(errorsOf({ age: 101 }).age).toEqual(['Idade deve estar entre 14 e 100 anos'])
    expect(errorsOf({ age: 0 }).age).toEqual(['Idade deve estar entre 14 e 100 anos'])
    expect(errorsOf({ age: -5 }).age).toEqual(['Idade deve estar entre 14 e 100 anos'])
  })

  it('as constantes exportadas são as faixas do Requisito 5.3', () => {
    expect(HEALTH_PROFILE_LIMITS).toEqual({
      weight_kg: { min: 30, max: 300 },
      height_cm: { min: 120, max: 230 },
      age: { min: 14, max: 100 }
    })
  })
})

describe('healthProfileSchema: casas decimais (multipleOf 0.01)', () => {
  it.each([82.5, 82.55, 30.01, 299.99, 100.1, 99.99, 45.07, 0.1 + 30.2])('peso %s é aceito', (weight) => {
    // 0.1 + 30.2 = 30.3 com erro de ponto flutuante: não pode ser recusado
    expect(accepts({ weight_kg: weight })).toBe(true)
  })

  it.each([82.555, 82.001, 30.001, 150.123456])('peso %s com mais de 2 casas é recusado', (weight) => {
    expect(errorsOf({ weight_kg: weight }).weight_kg).toEqual(['Peso deve ter no máximo 2 casas decimais'])
  })

  it('altura com 3 casas é recusada', () => {
    expect(errorsOf({ height_cm: 178.123 }).height_cm).toEqual(['Altura deve ter no máximo 2 casas decimais'])
  })

  it('TODOS os valores de 30,00 a 300,00 (27.001 pesos) e de 120,00 a 230,00 (11.001 alturas) passam', () => {
    // Protege contra falso erro de ponto flutuante, que barraria um peso válido digitado pelo usuário
    const rejected: number[] = []
    for (let cents = 3000; cents <= 30000; cents++) {
      if (!accepts({ weight_kg: cents / 100 })) rejected.push(cents / 100)
    }
    for (let cents = 12000; cents <= 23000; cents++) {
      if (!accepts({ height_cm: cents / 100 })) rejected.push(cents / 100)
    }
    expect(rejected).toEqual([])
  })

  it('a faixa vem antes das casas decimais na mensagem (29,999 aponta a faixa)', () => {
    expect(errorsOf({ weight_kg: 29.999 }).weight_kg?.[0]).toBe('Peso deve estar entre 30 e 300 kg')
  })
})

describe('healthProfileSchema: idade inteira', () => {
  it.each([28.5, 14.01, 99.9])('idade %s não é inteira', (age) => {
    expect(errorsOf({ age }).age?.[0]).toBe('Idade deve ser um número inteiro')
  })

  it('28.0 (que o JSON escreve como 28) é aceita', () => {
    expect(accepts(JSON.parse('{"age": 28.0}'))).toBe(true)
  })
})

describe('healthProfileSchema: tipos errados', () => {
  it.each(['82.5', true, [], {}, [82.5]])('peso %j (não é número) é recusado', (weight) => {
    expect(errorsOf({ weight_kg: weight }).weight_kg).toEqual(['Peso deve ser um número'])
  })

  it('NaN também não é número válido', () => {
    expect(errorsOf({ weight_kg: NaN }).weight_kg).toEqual(['Peso deve ser um número'])
  })

  it.each(['178', false, []])('altura %j é recusada', (height) => {
    expect(errorsOf({ height_cm: height }).height_cm).toEqual(['Altura deve ser um número'])
  })

  it.each(['28', true, {}])('idade %j é recusada', (age) => {
    expect(errorsOf({ age }).age).toEqual(['Idade deve ser um número'])
  })
})

describe('healthProfileSchema: enums', () => {
  it('os valores aceitos são exatamente os do Requisito 5 e do enum do Prisma', () => {
    expect(Object.values(Sex)).toEqual(['male', 'female'])
    expect(Object.values(ActivityLevel)).toEqual([
      'sedentary',
      'lightly_active',
      'moderately_active',
      'very_active',
      'extremely_active'
    ])
    expect(Object.values(FitnessGoal)).toEqual(['weight_loss', 'maintenance', 'muscle_gain', 'athletic_performance'])
  })

  it.each([
    ['sex', Sex],
    ['activity_level', ActivityLevel],
    ['fitness_goal', FitnessGoal]
  ])('%s aceita cada valor do enum e só eles', (field, enumObject) => {
    for (const value of Object.values(enumObject)) {
      expect(accepts({ [field]: value })).toBe(true)
    }
  })

  it.each(['Male', 'MALE', 'other', 'masculino', '', ' male', 'male ', 123, true, [], {}, 'constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'sexo %j é recusado com a mensagem do design',
    (sex) => {
      expect(errorsOf({ sex }).sex).toEqual(["Sexo deve ser 'male' ou 'female'"])
    }
  )

  it.each(['SEDENTARY', 'active', '', 'moderate', 3, 'constructor', '__proto__'])('nível de atividade %j é recusado listando os aceitos', (value) => {
    expect(errorsOf({ activity_level: value }).activity_level).toEqual([
      'Nível de atividade inválido. Valores aceitos: sedentary, lightly_active, moderately_active, very_active, extremely_active'
    ])
  })

  it.each(['hypertrophy', 'fatloss', 'endurance', 'WEIGHT_LOSS', '', 1, 'constructor'])('objetivo %j é recusado listando os aceitos', (value) => {
    expect(errorsOf({ fitness_goal: value }).fitness_goal).toEqual([
      'Objetivo inválido. Valores aceitos: weight_loss, maintenance, muscle_gain, athletic_performance'
    ])
  })
})

describe('healthProfileSchema: corpo e mensagens', () => {
  it.each([undefined, null, 'texto', 42, true, []])('corpo %j devolve mensagem em português', (body) => {
    const result = healthProfileSchema.safeParse(body)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().formErrors[0]).toMatch(/^Corpo da requisição /)
    }
  })

  it('parseOrThrow devolve UMA mensagem por campo, em português', () => {
    let error: unknown
    try {
      parseOrThrow(healthProfileSchema, {
        weight_kg: 5,
        height_cm: 500,
        age: 7.5,
        sex: 'x',
        activity_level: 'y',
        fitness_goal: 'z'
      })
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(ValidationError)
    const fields = (error as ValidationError).fields ?? {}
    expect(Object.keys(fields).sort()).toEqual(['activity_level', 'age', 'fitness_goal', 'height_cm', 'sex', 'weight_kg'])
    expect(fields.weight_kg).toBe('Peso deve estar entre 30 e 300 kg')
    expect(fields.age).toBe('Idade deve ser um número inteiro')
    for (const message of Object.values(fields)) {
      expect(message).not.toMatch(/Required|Expected|Invalid|received|Number must|String must/i)
    }
  })

  it('nenhuma mensagem de erro sai em inglês, em nenhum tipo de entrada errada', () => {
    const wrong = [null, undefined, 'x', 0, -1, 1e9, 28.5, true, [], {}, NaN, Infinity]
    const fields = ['weight_kg', 'height_cm', 'age', 'sex', 'activity_level', 'fitness_goal']
    const messages: string[] = []
    for (const field of fields) {
      for (const value of wrong) {
        const result = healthProfileSchema.safeParse({ [field]: value })
        if (!result.success) {
          messages.push(...result.error.issues.map((issue) => issue.message))
        }
      }
    }
    expect(messages.length).toBeGreaterThan(40)
    for (const message of messages) {
      expect(message).not.toMatch(/Required|Expected|Invalid |received|Number must|String must|Invalid enum/i)
    }
  })
})

describe('healthProfileReplaceSchema (PUT: substituição completa)', () => {
  const replaceErrors = (input: unknown) => {
    try {
      parseOrThrow(healthProfileReplaceSchema, input)
    } catch (error) {
      return error as ValidationError
    }
    throw new Error('Esperava falha')
  }

  it.each([[{}], [{ foo: 1 }], [{ id: 'x', user_id: 'y', updated_at: 'z' }]])('recusa %j (nenhum campo do perfil)', (input) => {
    const error = replaceErrors(input)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.statusCode).toBe(400)
    expect(error.toBody()).toEqual({
      error: 'ValidationError',
      message: 'Informe pelo menos um campo do perfil',
      fields: {}
    })
  })

  it('aceita um único campo, qualquer um', () => {
    for (const [key, value] of Object.entries(FULL)) {
      expect(parseOrThrow(healthProfileReplaceSchema, { [key]: value })).toEqual({ [key]: value })
    }
  })

  it('aceita os seis campos como null (limpar de propósito)', () => {
    const allNull = Object.fromEntries(Object.keys(FULL).map((key) => [key, null]))
    expect(parseOrThrow(healthProfileReplaceSchema, allNull)).toEqual(allNull)
  })

  it('um único campo null já conta como "informou algo"', () => {
    expect(parseOrThrow(healthProfileReplaceSchema, { age: null })).toEqual({ age: null })
  })

  it('com um campo inválido mostra o erro do campo, não o de "corpo vazio"', () => {
    const error = replaceErrors({ weight_kg: 5 })
    expect(error.toBody()).toEqual({
      error: 'ValidationError',
      message: 'Dados inválidos',
      fields: { weight_kg: 'Peso deve estar entre 30 e 300 kg' }
    })
  })

  it('corpo que não é objeto mantém a mensagem de corpo', () => {
    expect(replaceErrors(undefined).message).toBe('Corpo da requisição ausente')
    expect(replaceErrors([]).message).toBe('Corpo da requisição deve ser um objeto JSON')
  })
})
