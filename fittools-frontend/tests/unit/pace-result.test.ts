import { describe, it, expect } from 'vitest'
import {
  MAX_PACE,
  MIN_PACE,
  PACE_INVALID_MESSAGE,
  PACE_NOTE,
  PACE_TIME_REQUIRED_MESSAGE,
  PROJECTION_DISTANCES,
  buildPaceConversionTable,
  buildPaceResult,
  totalMinutes
} from '../../utils/pace-result'

type Row = readonly [number, number, number, number, string, string, ReadonlyArray<readonly [string, string]>]

// Valores esperados obtidos executando o science.js ORIGINAL do site antigo: distância, horas,
// minutos, segundos, pace, velocidade e, para 5 km, 10 km, meia maratona e maratona, o tempo
// previsto e o pace previsto.
// Exceções deliberadas: 5 km em 19min 59s e 10 km em 59min 59s. O original mostrava o pace como
// "3:00" e "5:00" (bug dos 60 segundos arredondados sem somar o minuto); o correto é "4:00" e
// "6:00", tanto no pace médio quanto no pace previsto para a própria distância.
const REFERENCE: ReadonlyArray<Row> = [
  [10, 0, 50, 0, '5:00', '12,0', [['23min 59s', '4:48'], ['50min 00s', '5:00'], ['1h 50min 19s', '5:14'], ['3h 50min 01s', '5:27']]],
  [5, 0, 25, 0, '5:00', '12,0', [['25min 00s', '5:00'], ['52min 07s', '5:13'], ['1h 55min 00s', '5:27'], ['3h 59min 47s', '5:41']]],
  [21.0975, 1, 45, 0, '4:59', '12,1', [['22min 50s', '4:34'], ['47min 35s', '4:46'], ['1h 45min 00s', '4:59'], ['3h 38min 55s', '5:11']]],
  [42.195, 4, 0, 0, '5:41', '10,5', [['25min 01s', '5:00'], ['52min 10s', '5:13'], ['1h 55min 07s', '5:27'], ['4h 0min 00s', '5:41']]],
  [10, 0, 41, 30, '4:09', '14,5', [['19min 54s', '3:59'], ['41min 30s', '4:09'], ['1h 31min 34s', '4:20'], ['3h 10min 54s', '4:31']]],
  [3, 0, 12, 5, '4:02', '14,9', [['20min 46s', '4:09'], ['43min 18s', '4:20'], ['1h 35min 32s', '4:32'], ['3h 19min 10s', '4:43']]],
  [0.4, 0, 1, 30, '3:45', '16,0', [['21min 49s', '4:22'], ['45min 29s', '4:33'], ['1h 40min 22s', '4:45'], ['3h 29min 16s', '4:58']]],
  [5, 0, 19, 59, '4:00', '15,0', [['19min 59s', '4:00'], ['41min 40s', '4:10'], ['1h 31min 56s', '4:21'], ['3h 11min 40s', '4:33']]],
  [1, 0, 3, 50, '3:50', '15,7', [['21min 07s', '4:13'], ['44min 01s', '4:24'], ['1h 37min 07s', '4:36'], ['3h 22min 28s', '4:48']]],
  [15.5, 1, 20, 10, '5:10', '11,6', [['24min 10s', '4:50'], ['50min 23s', '5:02'], ['1h 51min 09s', '5:16'], ['3h 51min 45s', '5:30']]],
  [300, 24, 0, 0, '4:48', '12,5', [['18min 46s', '3:45'], ['39min 08s', '3:55'], ['1h 26min 21s', '4:06'], ['3h 0min 03s', '4:16']]],
  [10, 0, 59, 59, '6:00', '10,0', [['28min 46s', '5:45'], ['59min 59s', '6:00'], ['2h 12min 21s', '6:16'], ['4h 35min 56s', '6:32']]]
]

describe('buildPaceResult', () => {
  it.each(REFERENCE)('%f km em %ih %imin %is', (km, h, m, s, paceText, speed, projections) => {
    const r = buildPaceResult({ distance_km: km, hours: h, minutes: m, seconds: s })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.headline.value).toBe(paceText)
    expect(r.headline.status).toBe(`Velocidade média de ${speed} km/h`)
    expect(r.table.rows.map(row => [row[1], row[2]!.replace(' min/km', '')])).toEqual(projections.map(p => [...p]))
  })

  it('estrutura: destaque, tabela de 4 provas e a observação', () => {
    const r = buildPaceResult({ distance_km: 10, hours: 0, minutes: 50, seconds: 0 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.headline).toEqual({
      label: 'Seu pace médio',
      value: '5:00',
      unit: 'min/km',
      status: 'Velocidade média de 12,0 km/h',
      tone: 'good'
    })
    expect(r.table.head).toEqual(['Prova', 'Tempo previsto', 'Pace previsto'])
    expect(r.table.rows.map(row => row[0])).toEqual([
      'Projeção 5 km',
      'Projeção 10 km',
      'Meia maratona (21,1 km)',
      'Maratona (42,2 km)'
    ])
    expect(r.table.rows[1]).toEqual(['Projeção 10 km', '50min 00s', '5:00 min/km'])
    expect(r.note).toBe(PACE_NOTE)
  })

  it('campos de tempo vazios valem zero (só minutos, só segundos...)', () => {
    const a = buildPaceResult({ distance_km: 5, minutes: 25 })
    const b = buildPaceResult({ distance_km: 5, hours: 0, minutes: 25, seconds: 0 })
    expect(a).toEqual(b)
    expect(buildPaceResult({ distance_km: 1, seconds: 240 }).ok).toBe(true)
  })

  it('o bug dos 60 segundos do original: 19min 59s em 5 km mostrava 3:00 e 59min 59s em 10 km mostrava 5:00', () => {
    const r = buildPaceResult({ distance_km: 10, minutes: 59, seconds: 59 })
    expect(r.ok && r.headline.value).toBe('6:00')
    const s = buildPaceResult({ distance_km: 5, minutes: 19, seconds: 59 })
    expect(s.ok && s.headline.value).toBe('4:00')
  })

  it('a projeção para a mesma distância devolve o mesmo tempo e pace', () => {
    const r = buildPaceResult({ distance_km: 10, minutes: 50 })
    expect(r.ok && r.table.rows[1]).toEqual(['Projeção 10 km', '50min 00s', '5:00 min/km'])
  })

  it('o pace previsto piora (aumenta) a cada prova mais longa', () => {
    const r = buildPaceResult({ distance_km: 10, minutes: 50 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const paces = r.table.rows.map(row => {
      const [m, s] = row[2]!.replace(' min/km', '').split(':').map(Number)
      return m! * 60 + s!
    })
    for (let i = 1; i < paces.length; i++) expect(paces[i]).toBeGreaterThan(paces[i - 1]!)
  })

  it('é determinístico (Req 1.12)', () => {
    const input = { distance_km: 12.3, hours: 1, minutes: 7, seconds: 41 }
    expect(buildPaceResult(input)).toEqual(buildPaceResult(input))
  })
})

describe('entradas sem resultado confiável', () => {
  it('tempo zerado ou ausente pede o tempo', () => {
    expect(buildPaceResult({ distance_km: 10 })).toEqual({ ok: false, error: PACE_TIME_REQUIRED_MESSAGE })
    expect(buildPaceResult({ distance_km: 10, hours: 0, minutes: 0, seconds: 0 })).toEqual({
      ok: false,
      error: PACE_TIME_REQUIRED_MESSAGE
    })
  })

  it('pace mais rápido que 1:30 por km é rejeitado (5 km em 5 segundos, 100 km em 1 hora)', () => {
    expect(buildPaceResult({ distance_km: 5, seconds: 5 })).toEqual({ ok: false, error: PACE_INVALID_MESSAGE })
    expect(buildPaceResult({ distance_km: 100, hours: 1 })).toEqual({ ok: false, error: PACE_INVALID_MESSAGE })
  })

  it('pace mais lento que 60 min/km é rejeitado (0,4 km em 24 horas)', () => {
    expect(buildPaceResult({ distance_km: 0.4, hours: 24 })).toEqual({ ok: false, error: PACE_INVALID_MESSAGE })
  })

  it('limites exatos de pace são aceitos: 1:30 e 60 min/km', () => {
    expect(MIN_PACE).toBe(1.5)
    expect(MAX_PACE).toBe(60)
    expect(buildPaceResult({ distance_km: 10, minutes: 15 }).ok).toBe(true) // 1,5 min/km
    expect(buildPaceResult({ distance_km: 1, hours: 1 }).ok).toBe(true) // 60 min/km
    expect(buildPaceResult({ distance_km: 1, hours: 1, seconds: 1 }).ok).toBe(false) // acima de 60
    expect(buildPaceResult({ distance_km: 10, minutes: 14, seconds: 59 }).ok).toBe(false) // abaixo de 1,5
  })
})

describe('totalMinutes', () => {
  it('soma horas, minutos e segundos; vazios valem zero', () => {
    expect(totalMinutes({ hours: 1, minutes: 30, seconds: 30 })).toBe(90.5)
    expect(totalMinutes({})).toBe(0)
    expect(totalMinutes({ seconds: 90 })).toBe(1.5)
  })
})

describe('tabela de conversão rápida', () => {
  it('bate com a lista do site antigo (pace, km/h, 5 km e 10 km)', () => {
    const table = buildPaceConversionTable()
    expect(table.head).toEqual(['Pace', 'Velocidade', '5 km', '10 km'])
    expect(table.rows).toEqual([
      ['6:00 min/km', '10,0 km/h', '30min 00s', '1h 0min 00s'],
      ['5:30 min/km', '10,9 km/h', '27min 30s', '55min 00s'],
      ['5:00 min/km', '12,0 km/h', '25min 00s', '50min 00s'],
      ['4:30 min/km', '13,3 km/h', '22min 30s', '45min 00s'],
      ['4:00 min/km', '15,0 km/h', '20min 00s', '40min 00s']
    ])
  })
})

describe('PROJECTION_DISTANCES', () => {
  it('5 km, 10 km, meia maratona e maratona oficiais', () => {
    expect(PROJECTION_DISTANCES.map(d => d.km)).toEqual([5, 10, 21.0975, 42.195])
  })
})