import { describe, it, expect } from 'vitest'
import {
  ACTIVITY_LEVELS,
  BELOW_BMR_WARNING,
  CALORIES_NOTE,
  DEFAULT_ACTIVITY,
  buildCaloriesResult
} from '../../utils/calories-result'

// Valores esperados obtidos executando o science.js ORIGINAL do site antigo
// (bmr, tdee, tdee - 500 e tdee + 300, arredondados como no site antigo).

describe('buildCaloriesResult', () => {
  it.each([
    // sexo, idade, kg, cm, fator, TMB, TDEE, déficit, superávit, déficit abaixo da TMB?
    ['male', 28, 75, 175, 1.55, 1709, 2649, 2149, 2949, false],
    ['male', 30, 80, 180, 1.55, 1780, 2759, 2259, 3059, false],
    ['female', 25, 60, 165, 1.2, 1345, 1614, 1114, 1914, true],
    ['female', 40, 55, 160, 1.375, 1189, 1635, 1135, 1935, true],
    ['male', 50, 110, 190, 1.725, 2043, 3523, 3023, 3823, false],
    ['female', 60, 70, 165, 1.9, 1270, 2413, 1913, 2713, false],
    ['male', 18, 45, 170, 1.2, 1428, 1713, 1213, 2013, true],
    ['female', 100, 40, 140, 1.2, 614, 737, 237, 1037, true],
    ['male', 35, 300, 230, 1.9, 4268, 8108, 7608, 8408, false],
    ['female', 22, 48, 155, 1.2, 1178, 1413, 913, 1713, true]
  ] as const)('%s %i anos %f kg %f cm x%f', (sex, age, kg, cm, factor, bmr, tdee, deficit, surplus, below) => {
    const r = buildCaloriesResult({ sex, age, weight_kg: kg, height_cm: cm, activityFactor: factor })
    expect(r.headline.value).toBe(tdee)
    expect(r.cards[0]!.value).toBe(bmr)
    expect(r.deficitBelowBmr).toBe(below)

    const fmt = (n: number) => `${n.toLocaleString('pt-BR')} kcal`
    expect(r.table.rows[0]![1]).toBe(fmt(deficit))
    expect(r.table.rows[1]![1]).toBe(fmt(tdee))
    expect(r.table.rows[2]![1]).toBe(fmt(surplus))
  })

  it('estrutura do resultado: destaque, cartões, tabela com 3 objetivos', () => {
    const r = buildCaloriesResult({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, activityFactor: 1.55 })
    expect(r.headline).toEqual({
      label: 'Gasto calórico diário estimado (TDEE)',
      value: 2759,
      unit: 'kcal',
      status: 'Manutenção de peso',
      tone: 'good'
    })
    expect(r.cards).toEqual([
      { label: 'TMB (em repouso)', value: 1780, unit: 'kcal', tone: 'info' },
      { label: 'Fator de atividade', value: '×1,55' }
    ])
    expect(r.table.head).toEqual(['Objetivo', 'Calorias por dia', 'Ajuste'])
    expect(r.table.rows).toEqual([
      ['Perder gordura (déficit moderado)', '2.259 kcal', '−500 kcal'],
      ['Manter o peso', '2.759 kcal', 'Sem ajuste'],
      ['Ganhar massa (superávit leve)', '3.059 kcal', '+300 kcal']
    ])
  })

  it('fator com 3 casas aparece com vírgula', () => {
    const r = buildCaloriesResult({ sex: 'female', age: 40, weight_kg: 55, height_cm: 160, activityFactor: 1.375 })
    expect(r.cards[1]!.value).toBe('×1,375')
  })

  it('déficit acima da TMB: só a observação padrão', () => {
    const r = buildCaloriesResult({ sex: 'male', age: 30, weight_kg: 80, height_cm: 180, activityFactor: 1.55 })
    expect(r.note).toBe(CALORIES_NOTE)
    expect(r.note).not.toContain('Atenção')
  })

  it('déficit abaixo da TMB: acrescenta o aviso para não comer abaixo da TMB', () => {
    const r = buildCaloriesResult({ sex: 'female', age: 25, weight_kg: 60, height_cm: 165, activityFactor: 1.2 })
    expect(r.deficitBelowBmr).toBe(true)
    expect(r.note).toBe(`${CALORIES_NOTE} ${BELOW_BMR_WARNING}`)
    expect(BELOW_BMR_WARNING).toContain('nutricionista ou médico')
  })

  it('limite exato: déficit igual à TMB não dispara o aviso', () => {
    // TDEE = TMB + 500 => fator tal que tdee - 500 === bmr. Com TMB 2000 (valor arredondado) e fator 1,25.
    // homem: 10*70 + 6,25*170 - 5*30 + 5 = 700 + 1062,5 - 150 + 5 = 1617,5; fator 1,3092...
    const bmr = 10 * 70 + 6.25 * 170 - 5 * 30 + 5
    const r = buildCaloriesResult({ sex: 'male', age: 30, weight_kg: 70, height_cm: 170, activityFactor: (bmr + 500) / bmr })
    expect(r.deficitBelowBmr).toBe(false)
  })

  it('é determinístico (Req 1.12)', () => {
    const input = { sex: 'female', age: 33, weight_kg: 64.5, height_cm: 168, activityFactor: 1.375 } as const
    expect(buildCaloriesResult(input)).toEqual(buildCaloriesResult(input))
  })
})

describe('ACTIVITY_LEVELS', () => {
  it('5 níveis com os fatores convencionais, em ordem crescente', () => {
    expect(ACTIVITY_LEVELS.map(l => l.factor)).toEqual([1.2, 1.375, 1.55, 1.725, 1.9])
    expect(ACTIVITY_LEVELS.map(l => l.label)).toEqual(['Sedentário', 'Leve', 'Moderado', 'Intenso', 'Muito intenso'])
  })

  it('o valor do select é o próprio fator, e o padrão existe na lista', () => {
    for (const level of ACTIVITY_LEVELS) expect(Number(level.value)).toBe(level.factor)
    expect(ACTIVITY_LEVELS.some(l => l.value === DEFAULT_ACTIVITY)).toBe(true)
    expect(DEFAULT_ACTIVITY).toBe('1.55')
  })

  it('cada nível corresponde a uma chave diferente do perfil de saúde da API (Task 8.2)', () => {
    const keys = ACTIVITY_LEVELS.map(l => l.profileKey)
    expect(new Set(keys).size).toBe(5)
    expect(keys).toEqual(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'])
  })
})