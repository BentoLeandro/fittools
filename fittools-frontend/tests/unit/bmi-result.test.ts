import { describe, it, expect } from 'vitest'
import { BMI_NOTE, buildBmiResult } from '../../utils/bmi-result'

// Valores esperados obtidos executando o science.js ORIGINAL do site antigo.

describe('buildBmiResult', () => {
  it('peso normal: 75,5 kg e 175 cm', () => {
    const r = buildBmiResult(75.5, 175)
    expect(r.headline).toEqual({ label: 'Seu IMC', value: 24.7, unit: 'kg/m²', status: 'Peso normal', tone: 'good' })
    expect(r.cards[0]).toEqual({ label: 'Faixa de peso saudável', value: '56,7–76,3', unit: 'kg' })
    expect(r.cards[1]).toEqual({ label: 'Diferença para a faixa', value: '0', unit: 'kg' })
    expect(r.note).toBe(BMI_NOTE)
  })

  it.each([
    // kg, cm, IMC, classificação, tom, faixa, diferença
    [50, 170, 17.3, 'Abaixo do peso', 'warn', '53,5–72,0', '−3,5'],
    [45, 180, 13.9, 'Abaixo do peso', 'warn', '59,9–80,7', '−14,9'],
    [60, 160, 23.4, 'Peso normal', 'good', '47,4–63,7', '0'],
    [90, 180, 27.8, 'Sobrepeso', 'warn', '59,9–80,7', '+9,3'],
    [80, 170, 27.7, 'Sobrepeso', 'warn', '53,5–72,0', '+8,0'],
    [100, 170, 34.6, 'Obesidade grau I', 'bad', '53,5–72,0', '+28,0'],
    [110, 175, 35.9, 'Obesidade grau II', 'bad', '56,7–76,3', '+33,7'],
    [250, 180, 77.2, 'Obesidade grau III', 'bad', '59,9–80,7', '+169,3']
  ] as const)('%f kg, %i cm => IMC %f (%s)', (kg, cm, bmi, label, tone, range, difference) => {
    const r = buildBmiResult(kg, cm)
    expect(r.headline.value).toBe(bmi)
    expect(r.headline.status).toBe(label)
    expect(r.headline.tone).toBe(tone)
    expect(r.cards[0]!.value).toBe(range)
    expect(r.cards[1]!.value).toBe(difference)
  })

  it('classifica pelo IMC arredondado: 24,96 aparece como 25,0 e "Sobrepeso" (nunca "25,0 Peso normal")', () => {
    const r = buildBmiResult(72.14, 170) // IMC exato 24,9602
    expect(r.headline.value).toBe(25)
    expect(r.headline.status).toBe('Sobrepeso')
    expect(r.cards[1]!.value).toBe('+0,2')
  })

  it('IMC que arredonda para dentro da faixa é "Peso normal" com diferença 0, mesmo no limite', () => {
    const upper = buildBmiResult(72.08, 170) // IMC exato 24,941 -> 24,9
    expect(upper.headline.value).toBe(24.9)
    expect(upper.headline.status).toBe('Peso normal')
    expect(upper.cards[1]!.value).toBe('0')

    const lower = buildBmiResult(53.35, 170) // IMC exato 18,460 -> 18,5
    expect(lower.headline.value).toBe(18.5)
    expect(lower.headline.status).toBe('Peso normal')
    expect(lower.cards[1]!.value).toBe('0')
  })

  it('é determinístico (Req 1.12)', () => {
    expect(buildBmiResult(82.3, 178)).toEqual(buildBmiResult(82.3, 178))
  })

  it('limites da validação da página (30 kg/120 cm e 300 kg/230 cm) produzem resultado finito', () => {
    for (const [kg, cm] of [[30, 120], [300, 230], [30, 230], [300, 120]]) {
      const r = buildBmiResult(kg!, cm!)
      expect(Number.isFinite(r.headline.value as number)).toBe(true)
      expect(r.cards[0]!.value).toMatch(/^\d+,\d–\d+,\d$/)
    }
  })
})