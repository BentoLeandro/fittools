import { describe, it, expect } from 'vitest'
import { proteinRange } from '../../composables/useScience'
import {
  CHICKEN_PROTEIN_PER_100G,
  DEFAULT_PROTEIN_GOAL,
  EGG_PROTEIN_G,
  FATLOSS_NOTE,
  PROTEIN_FOODS,
  PROTEIN_GOALS,
  PROTEIN_NOTE,
  buildProteinResult,
  formatPerKg
} from '../../utils/protein-result'

// mínimo, máximo, alvo prático e por refeição vêm do science.js ORIGINAL do site antigo.

describe('buildProteinResult', () => {
  it.each([
    // kg, objetivo, mín, máx, alvo, por refeição, g/kg, frango (g), ovos
    [75, 'hypertrophy', 120, 165, 143, 36, '1,6–2,2 g por kg', 445, 23],
    [60, 'fatloss', 108, 144, 126, 32, '1,8–2,4 g por kg', 394, 20],
    [80, 'maintenance', 112, 144, 128, 32, '1,4–1,8 g por kg', 400, 20],
    [70, 'endurance', 84, 112, 98, 25, '1,2–1,6 g por kg', 306, 16],
    [30, 'fatloss', 54, 72, 63, 16, '1,8–2,4 g por kg', 197, 10],
    [300, 'hypertrophy', 480, 660, 570, 143, '1,6–2,2 g por kg', 1781, 90],
    [82.5, 'maintenance', 115, 149, 132, 33, '1,4–1,8 g por kg', 413, 21],
    [55.5, 'endurance', 67, 89, 78, 19, '1,2–1,6 g por kg', 243, 12]
  ] as const)('%f kg %s', (kg, goal, min, max, middle, perMeal, perKg, chicken, eggs) => {
    const r = buildProteinResult(kg, goal)
    expect(r.headline.value).toBe(`${min.toLocaleString('pt-BR')}–${max.toLocaleString('pt-BR')}`)
    expect(r.headline.unit).toBe('g')
    expect(r.headline.status).toBe(perKg)
    expect(r.cards.map(c => c.value)).toEqual([middle, perMeal, chicken, eggs])
  })

  it('estrutura: destaque, 4 cartões e observação do site antigo', () => {
    const r = buildProteinResult(75, 'hypertrophy')
    expect(r.headline).toEqual({
      label: 'Sua meta diária de proteína',
      value: '120–165',
      unit: 'g',
      status: '1,6–2,2 g por kg',
      tone: 'good'
    })
    expect(r.cards).toEqual([
      { label: 'Alvo prático', value: 143, unit: 'g/dia' },
      { label: 'Por refeição (4x)', value: 36, unit: 'g' },
      { label: 'Equivalente em frango grelhado', value: 445, unit: 'g' },
      { label: 'Equivalente em ovos', value: 23, unit: 'un' }
    ])
    expect(r.note).toBe(PROTEIN_NOTE)
  })

  it('emagrecimento: a observação começa com a frase sobre o déficit calórico', () => {
    const r = buildProteinResult(100, 'fatloss')
    expect(FATLOSS_NOTE).toBe('No déficit calórico a necessidade de proteína é maior, para proteger a massa muscular.')
    expect(r.note).toBe(`${FATLOSS_NOTE} ${PROTEIN_NOTE}`)
    expect(r.headline.value).toBe('180–240')
  })

  it('os outros objetivos não mostram a frase do déficit', () => {
    for (const goal of ['hypertrophy', 'maintenance', 'endurance'] as const) {
      const r = buildProteinResult(100, goal)
      expect(r.note, goal).toBe(PROTEIN_NOTE)
      expect(r.note, goal).not.toContain('déficit')
    }
  })
  it('o resultado usa as mesmas faixas g/kg do proteinRange (fonte única)', () => {
    for (const goal of PROTEIN_GOALS) {
      const range = proteinRange(1, goal.value)
      const r = buildProteinResult(1, goal.value)
      expect(r.headline.status).toBe(`${formatPerKg(range.perKgMin)}–${formatPerKg(range.perKgMax)} g por kg`)
    }
  })

  it('é determinístico (Req 1.12)', () => {
    expect(buildProteinResult(77.7, 'fatloss')).toEqual(buildProteinResult(77.7, 'fatloss'))
  })

  it('limites do formulário (30 e 300 kg) dão resultado finito em todos os objetivos', () => {
    for (const goal of PROTEIN_GOALS) {
      for (const kg of [30, 300]) {
        const r = buildProteinResult(kg, goal.value)
        for (const card of r.cards) expect(Number.isFinite(card.value as number)).toBe(true)
      }
    }
  })
})

describe('constantes', () => {
  it('equivalências: frango grelhado (TACO) e ovo médio', () => {
    expect(CHICKEN_PROTEIN_PER_100G).toBe(32)
    expect(EGG_PROTEIN_G).toBe(6.3)
  })

  it('4 objetivos na ordem do formulário, com o padrão existente', () => {
    expect(PROTEIN_GOALS.map(g => g.value)).toEqual(['hypertrophy', 'fatloss', 'maintenance', 'endurance'])
    expect(PROTEIN_GOALS.some(g => g.value === DEFAULT_PROTEIN_GOAL)).toBe(true)
  })

  it('formatPerKg usa vírgula e uma casa quando precisa', () => {
    expect(formatPerKg(1.6)).toBe('1,6')
    expect(formatPerKg(2)).toBe('2')
  })
})

describe('PROTEIN_FOODS (TACO 4ª ed. / IBGE)', () => {
  it('8 alimentos, do maior para o menor teor, todos positivos', () => {
    expect(PROTEIN_FOODS).toHaveLength(8)
    const values = PROTEIN_FOODS.map(f => f.protein)
    expect(values).toEqual([...values].sort((a, b) => b - a))
    for (const food of PROTEIN_FOODS) {
      expect(food.protein).toBeGreaterThan(0)
      expect(food.protein).toBeLessThan(100)
      expect(food.name.length).toBeGreaterThan(3)
    }
  })

  it('valores conferidos na fonte', () => {
    const by = Object.fromEntries(PROTEIN_FOODS.map(f => [f.name, f.protein]))
    expect(by['Carne bovina (patinho) grelhada']).toBe(35.9)
    expect(by['Peito de frango sem pele grelhado']).toBe(32)
    expect(by['Atum em conserva (em óleo)']).toBe(26.2)
    expect(by['Queijo minas frescal']).toBe(17.4)
    expect(by['Ovo de galinha cozido']).toBe(12.6)
    expect(by['Lentilha cozida']).toBe(6.3)
    expect(by['Feijão carioca cozido']).toBe(4.8)
    expect(by['Leite de vaca integral']).toBe(3.2)
  })

  it('o frango da tabela é o mesmo valor usado na equivalência do resultado', () => {
    expect(PROTEIN_FOODS.find(f => f.name.startsWith('Peito de frango'))!.protein).toBe(CHICKEN_PROTEIN_PER_100G)
  })
})