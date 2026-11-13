import { describe, it, expect } from 'vitest'
import { waterIntake } from '../../composables/useScience'
import { HYDRATION_TIPS, WATER_NOTE, buildWaterResult } from '../../utils/water-result'

// Valores esperados obtidos executando o science.js ORIGINAL do site antigo:
// peso, minutos, meta total (L), base (L), reposição (L), copos de 250 ml, garrafas de 500 ml.
// Exceções deliberadas (empates de 0,05 L): o toFixed(1) do site antigo arredonda alguns empates para
// baixo por causa da representação binária (56 dos 280 múltiplos de 50 mL). Aqui o empate sempre
// sobe: 70 kg e 60 min dá 3.150 mL (antigo "3,1", agora "3,2") e 55 kg e 30 min dá 350 mL de suor
// (antigo "0,3", agora "0,4"), o que mantém a soma da tela coerente (2,5 + 0,7 = 3,2).
const REFERENCE: ReadonlyArray<readonly [number, number, string, string, string, number, number]> = [
  [70, 0, '2,5', '2,5', '0,0', 10, 5],
  [70, 60, '3,2', '2,5', '0,7', 13, 7],
  [80, 90, '3,9', '2,8', '1,1', 16, 8],
  [55, 30, '2,3', '1,9', '0,4', 10, 5],
  [75, 60, '3,3', '2,6', '0,7', 14, 7],
  [30, 0, '1,1', '1,1', '0,0', 5, 3],
  [300, 300, '14,0', '10,5', '3,5', 56, 28],
  [62.5, 45, '2,7', '2,2', '0,5', 11, 6],
  [100, 120, '4,9', '3,5', '1,4', 20, 10],
  [48, 15, '1,9', '1,7', '0,2', 8, 4],
  [85.5, 75, '3,9', '3,0', '0,9', 16, 8]
]

describe('buildWaterResult', () => {
  it.each(REFERENCE)('%f kg e %i min', (kg, minutes, total, base, exercise, glasses, bottles) => {
    const r = buildWaterResult(kg, minutes)
    expect(r.headline.value).toBe(total)
    expect(r.cards.map(c => c.value)).toEqual([base, exercise, glasses, bottles])
  })

  it('estrutura: destaque, 4 cartões e a observação com a ressalva médica', () => {
    const r = buildWaterResult(75, 60)
    expect(r.headline).toEqual({
      label: 'Meta diária de água',
      value: '3,3',
      unit: 'L',
      status: 'Base 35 mL/kg + reposição de treino',
      tone: 'good'
    })
    expect(r.cards).toEqual([
      { label: 'Consumo base', value: '2,6', unit: 'L' },
      { label: 'Reposição de suor', value: '0,7', unit: 'L', tone: 'info' },
      { label: 'Copos de 250 ml', value: 14, unit: 'copos' },
      { label: 'Garrafas de 500 ml', value: 7, unit: 'un' }
    ])
    expect(r.note).toBe(WATER_NOTE)
    expect(WATER_NOTE).toContain('doença renal ou cardíaca')
  })

  it('minutos omitidos contam como zero (campo opcional)', () => {
    expect(buildWaterResult(70)).toEqual(buildWaterResult(70, 0))
    expect(buildWaterResult(70).cards[1]!.value).toBe('0,0')
  })

  it('o total mostrado bate com a soma da base e da reposição mostradas', () => {
    for (const kg of [30, 45, 52.5, 70, 80, 90, 100, 123, 300]) {
      for (const min of [0, 15, 30, 45, 60, 90, 120, 300]) {
        const r = buildWaterResult(kg, min)
        const parse = (v: string | number) => Number(String(v).replace(',', '.'))
        const sum = parse(r.cards[0]!.value) + parse(r.cards[1]!.value)
        // cada valor é arredondado a 0,1 L, então a soma pode diferir do total em até 0,1
        expect(Math.abs(sum - parse(r.headline.value)), `${kg} kg ${min} min`).toBeLessThanOrEqual(0.1000001)
      }
    }
  })

  it('empate exato de 0,05 L arredonda para cima (3,15 L => 3,2), diferente do toFixed do site antigo', () => {
    expect(waterIntake(90, 0).total).toBe(3150)
    expect((3150 / 1000).toFixed(1)).toBe('3.1') // o que o site antigo mostrava
    expect(buildWaterResult(90, 0).headline.value).toBe('3,2')
  })

  it('o mesmo vale para a reposição de suor: 350 mL => 0,4 L (o antigo mostrava 0,3)', () => {
    expect(waterIntake(55, 30).exercise).toBe(350)
    expect((350 / 1000).toFixed(1)).toBe('0.3') // o que o site antigo mostrava
    expect(buildWaterResult(55, 30).cards[1]!.value).toBe('0,4')
  })
  it('copos e garrafas arredondam para cima (sempre cobrem a meta)', () => {
    const r = buildWaterResult(70, 0) // 2.450 mL
    expect(r.cards[2]!.value).toBe(10) // 9,8 copos
    expect(r.cards[3]!.value).toBe(5) // 4,9 garrafas
  })

  it('limites do formulário (30 e 300 kg, 0 e 300 min) dão resultado finito', () => {
    for (const kg of [30, 300]) {
      for (const min of [0, 300]) {
        const r = buildWaterResult(kg, min)
        expect(r.headline.value).toMatch(/^\d+,\d$/)
        for (const card of r.cards.slice(2)) expect(Number.isFinite(card.value as number)).toBe(true)
      }
    }
  })

  it('é determinístico (Req 1.12)', () => {
    expect(buildWaterResult(77.7, 52)).toEqual(buildWaterResult(77.7, 52))
  })
})

describe('HYDRATION_TIPS', () => {
  it('3 dicas na ordem antes, durante e depois do treino', () => {
    expect(HYDRATION_TIPS.map(t => t.when)).toEqual(['antes', 'durante', 'depois'])
    expect(HYDRATION_TIPS.map(t => t.title)).toEqual(['Antes do treino', 'Durante o treino', 'Depois do treino'])
  })

  it('trazem as referências do ACSM: 5 a 7 mL/kg, atenção à hiponatremia e 1,5 L por kg perdido', () => {
    const text = HYDRATION_TIPS.map(t => t.text).join(' ')
    expect(text).toContain('5 a 7 mL por kg')
    expect(text).toContain('4 horas')
    expect(text).toContain('hiponatremia')
    expect(text).toContain('1,5 L para cada kg')
  })

  it('o exemplo de 70 kg (350 a 490 mL) bate com 5 a 7 mL/kg', () => {
    expect(70 * 5).toBe(350)
    expect(70 * 7).toBe(490)
    expect(HYDRATION_TIPS[0]!.text).toContain('350 a 490 mL')
  })
})