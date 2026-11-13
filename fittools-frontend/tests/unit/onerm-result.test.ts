import { describe, it, expect } from 'vitest'
import { ONERM_NOTE, buildOneRmResult, oneRmMethod } from '../../utils/onerm-result'

// Valores esperados obtidos executando o science.js ORIGINAL do site antigo:
// carga, repetições, 1RM, 85%, 75%, 65%, 60% e as 9 cargas da tabela (100% a 60%).
const REFERENCE: ReadonlyArray<readonly [number, number, number, number, number, number, number, number[]]> = [
  [80, 8, 99.3, 84.4, 74.5, 64.6, 59.6, [99.3, 94.3, 89.4, 84.4, 79.4, 74.5, 69.5, 64.6, 59.6]],
  [100, 5, 112.5, 95.6, 84.4, 73.1, 67.5, [112.5, 106.9, 101.3, 95.6, 90, 84.4, 78.8, 73.1, 67.5]],
  [60, 12, 84, 71.4, 63, 54.6, 50.4, [84, 79.8, 75.6, 71.4, 67.2, 63, 58.8, 54.6, 50.4]],
  [120, 1, 120, 102, 90, 78, 72, [120, 114, 108, 102, 96, 90, 84, 78, 72]],
  [40, 20, 66.7, 56.7, 50, 43.3, 40, [66.7, 63.3, 60, 56.7, 53.3, 50, 46.7, 43.3, 40]],
  [100, 10, 133.3, 113.3, 100, 86.7, 80, [133.3, 126.7, 120, 113.3, 106.7, 100, 93.3, 86.7, 80]],
  [100, 11, 136.7, 116.2, 102.5, 88.8, 82, [136.7, 129.8, 123, 116.2, 109.3, 102.5, 95.7, 88.8, 82]],
  [200, 3, 211.8, 180, 158.8, 137.6, 127.1, [211.8, 201.2, 190.6, 180, 169.4, 158.8, 148.2, 137.6, 127.1]],
  [22.5, 15, 33.8, 28.7, 25.3, 21.9, 20.3, [33.8, 32.1, 30.4, 28.7, 27, 25.3, 23.6, 21.9, 20.3]],
  [1, 1, 1, 0.9, 0.8, 0.7, 0.6, [1, 1, 0.9, 0.9, 0.8, 0.8, 0.7, 0.7, 0.6]],
  [600, 2, 617.1, 524.6, 462.9, 401.1, 370.3, [617.1, 586.3, 555.4, 524.6, 493.7, 462.9, 432, 401.1, 370.3]],
  [82.5, 6, 95.8, 81.4, 71.9, 62.3, 57.5, [95.8, 91, 86.2, 81.4, 76.6, 71.9, 67.1, 62.3, 57.5]]
]

const pt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

describe('buildOneRmResult', () => {
  it.each(REFERENCE)('%f kg x %i reps => 1RM %f', (kg, reps, oneRm, strength, hypertrophy, endurance, warmup, table) => {
    const r = buildOneRmResult(kg, reps)
    expect(r.headline.value).toBe(oneRm)
    expect(r.cards.map(c => c.value)).toEqual([strength, hypertrophy, endurance, warmup])
    expect(r.table.rows.map(row => row[1])).toEqual(table.map(v => `${pt(v)} kg`))
  })

  it('estrutura completa: destaque, 4 cartões, tabela de 9 linhas e a observação de segurança', () => {
    const r = buildOneRmResult(80, 8)
    expect(r.headline).toEqual({ label: '1RM estimado', value: 99.3, unit: 'kg', status: 'Fórmula de Brzycki', tone: 'good' })
    expect(r.cards).toEqual([
      { label: 'Força (85%)', value: 84.4, unit: 'kg ≈ 6 reps' },
      { label: 'Hipertrofia (75%)', value: 74.5, unit: 'kg ≈ 10 reps' },
      { label: 'Resistência (65%)', value: 64.6, unit: 'kg ≈ 15 reps' },
      { label: 'Aquecimento (60%)', value: 59.6, unit: 'kg' }
    ])
    expect(r.table.head).toEqual(['% do 1RM', 'Carga', 'Reps estimadas'])
    expect(r.table.rows.map(row => row[0])).toEqual(['100%', '95%', '90%', '85%', '80%', '75%', '70%', '65%', '60%'])
    expect(r.table.rows.map(row => row[2])).toEqual(['~1', '~2', '~4', '~6', '~8', '~10', '~12', '~15', '~18'])
    expect(r.table.rows[0]![1]).toBe('99,3 kg')
    expect(r.note).toBe(ONERM_NOTE)
    expect(ONERM_NOTE).toContain('parceiro de treino')
  })

  it('as cargas da tabela caem a cada linha e a primeira é o próprio 1RM', () => {
    const r = buildOneRmResult(137.5, 4)
    const loads = r.table.rows.map(row => Number(row[1]!.replace(' kg', '').replace('.', '').replace(',', '.')))
    for (let i = 1; i < loads.length; i++) expect(loads[i]).toBeLessThan(loads[i - 1]!)
    expect(loads[0]).toBe(r.headline.value)
  })

  it('é determinístico (Req 1.12)', () => {
    expect(buildOneRmResult(87.5, 7)).toEqual(buildOneRmResult(87.5, 7))
  })

  it('limites do formulário (1 a 600 kg, 1 a 20 reps) dão resultado finito', () => {
    for (const kg of [1, 600]) {
      for (const reps of [1, 10, 11, 20]) {
        const r = buildOneRmResult(kg, reps)
        expect(Number.isFinite(r.headline.value as number)).toBe(true)
        for (const card of r.cards) expect(Number.isFinite(card.value as number)).toBe(true)
      }
    }
  })
})

describe('oneRmMethod', () => {
  it('1 repetição é a própria carga; até 10 Brzycki; acima de 10 Epley', () => {
    expect(oneRmMethod(1)).toBe('Carga informada (1 repetição)')
    expect(oneRmMethod(2)).toBe('Fórmula de Brzycki')
    expect(oneRmMethod(10)).toBe('Fórmula de Brzycki')
    expect(oneRmMethod(11)).toBe('Fórmula de Epley')
    expect(oneRmMethod(20)).toBe('Fórmula de Epley')
  })

  it('o rótulo do resultado acompanha o método', () => {
    expect(buildOneRmResult(100, 10).headline.status).toBe('Fórmula de Brzycki')
    expect(buildOneRmResult(100, 11).headline.status).toBe('Fórmula de Epley')
    expect(buildOneRmResult(120, 1).headline.status).toBe('Carga informada (1 repetição)')
  })
})