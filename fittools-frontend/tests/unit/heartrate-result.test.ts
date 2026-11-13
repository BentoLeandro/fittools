import { describe, it, expect } from 'vitest'
import { hrZones, karvonen, maxHeartRate } from '../../composables/useScience'
import {
  HEART_RATE_NOTE,
  HEART_RATE_ZONE_GUIDE,
  buildHeartRateResult
} from '../../utils/heartrate-result'

// Valores esperados obtidos executando o science.js ORIGINAL do site antigo
// (idade, FC de repouso, FC máxima arredondada, faixas de Z1 a Z5).
const REFERENCE: ReadonlyArray<readonly [number, number, number, string[]]> = [
  [30, 60, 187, ['124–136', '136–149', '149–162', '162–174', '174–187']],
  [20, 50, 194, ['122–136', '136–151', '151–165', '165–180', '180–194']],
  [45, 70, 177, ['123–134', '134–145', '145–155', '155–166', '166–177']],
  [60, 65, 166, ['116–126', '126–136', '136–146', '146–156', '156–166']],
  [14, 30, 198, ['114–131', '131–148', '148–165', '165–181', '181–198']],
  [100, 110, 138, ['124–127', '127–130', '130–132', '132–135', '135–138']],
  [18, 45, 195, ['120–135', '135–150', '150–165', '165–180', '180–195']],
  [55, 80, 170, ['125–134', '134–143', '143–152', '152–161', '161–170']],
  [33, 72, 185, ['128–140', '140–151', '151–162', '162–174', '174–185']]
]

describe('buildHeartRateResult', () => {
  it.each(REFERENCE)('idade %i, repouso %i => FCmáx %i', (age, rest, max, zones) => {
    const r = buildHeartRateResult(age, rest)
    expect(r.headline.value).toBe(max)
    expect(r.cards.map(c => c.value)).toEqual(zones)
  })

  it('estrutura: destaque, 5 cartões nomeados e coloridos e a observação', () => {
    const r = buildHeartRateResult(30, 60)
    expect(r.headline).toEqual({
      label: 'Frequência cardíaca máxima estimada',
      value: 187,
      unit: 'bpm',
      status: 'Equação de Tanaka',
      tone: 'good'
    })
    expect(r.cards.map(c => c.label)).toEqual([
      'Z1 — Recuperação',
      'Z2 — Base aeróbica',
      'Z3 — Aeróbico',
      'Z4 — Limiar',
      'Z5 — Máximo'
    ])
    expect(r.cards.map(c => c.tone)).toEqual(['info', 'good', 'good', 'warn', 'bad'])
    expect(r.cards.every(c => c.unit === 'bpm')).toBe(true)
    expect(r.note).toBe(HEART_RATE_NOTE)
  })

  it('FC máxima com .5 arredonda para cima (176,5 => 177), como no site antigo', () => {
    expect(maxHeartRate(45)).toBe(176.5)
    expect(buildHeartRateResult(45, 70).headline.value).toBe(177)
  })

  it('as zonas são contíguas e crescentes, e a Z5 termina na FC máxima', () => {
    for (const [age, rest] of [[14, 30], [30, 60], [60, 65], [100, 110]] as const) {
      const faixas = buildHeartRateResult(age, rest).cards.map(c => String(c.value).split('–').map(Number) as [number, number])
      for (let i = 1; i < faixas.length; i++) expect(faixas[i]![0]).toBe(faixas[i - 1]![1])
      for (const [min, max] of faixas) expect(max).toBeGreaterThanOrEqual(min)
      expect(faixas[4]![1]).toBe(Math.round(maxHeartRate(age)))
    }
  })

  it('combinações extremas do formulário (idade 14 a 100, repouso 30 a 110) mantêm repouso abaixo da máxima', () => {
    for (const age of [14, 100]) {
      for (const rest of [30, 110]) {
        expect(maxHeartRate(age)).toBeGreaterThan(rest)
        const r = buildHeartRateResult(age, rest)
        expect(r.cards).toHaveLength(5)
        expect(Number.isFinite(r.headline.value as number)).toBe(true)
      }
    }
  })

  it('é determinístico (Req 1.12)', () => {
    expect(buildHeartRateResult(41, 58)).toEqual(buildHeartRateResult(41, 58))
  })
})

describe('HEART_RATE_ZONE_GUIDE (texto das zonas)', () => {
  it('5 zonas com os percentuais da FC de reserva, contíguos de 50% a 100%', () => {
    expect(HEART_RATE_ZONE_GUIDE).toHaveLength(5)
    expect(HEART_RATE_ZONE_GUIDE.map(z => [z.from, z.to])).toEqual([[50, 60], [60, 70], [70, 80], [80, 90], [90, 100]])
    for (const zone of HEART_RATE_ZONE_GUIDE) {
      expect(zone.title.length).toBeGreaterThan(5)
      expect(zone.description.length).toBeGreaterThan(20)
    }
  })

  it('os percentuais do texto batem com as faixas calculadas (não podem divergir)', () => {
    for (const [age, rest] of [[30, 60], [45, 70], [20, 50], [60, 65]] as const) {
      const max = maxHeartRate(age)
      const { zones } = hrZones(age, rest)
      HEART_RATE_ZONE_GUIDE.forEach((guide, i) => {
        expect(zones[i]!.min, `Z${i + 1} início`).toBe(Math.round(karvonen(max, rest, guide.from / 100)))
        expect(zones[i]!.max, `Z${i + 1} fim`).toBe(Math.round(karvonen(max, rest, guide.to / 100)))
      })
    }
  })
})