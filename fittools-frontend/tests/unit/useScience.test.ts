import { describe, it, expect } from 'vitest'
import {
  SCIENCE_REFERENCES,
  bodyFatNavy,
  classifyBMI,
  classifyBodyFat,
  compute1RM,
  computeBMI,
  computeBMR,
  computeTDEE,
  formatPace,
  formatTime,
  generate1RMTable,
  hrZones,
  karvonen,
  maxHeartRate,
  pace,
  proteinRange,
  riegelProjection,
  round,
  useScience,
  waterIntake
} from '../../composables/useScience'

// Os valores de referência (sufixo "ref") foram obtidos executando o science.js ORIGINAL
// do site antigo, e conferidos à mão contra as fórmulas publicadas. Comparamos com toBe:
// a migração deve ser numericamente idêntica (Requisito 1.11).

describe('round', () => {
  it('arredonda para N casas e usa 0 por padrão', () => {
    expect(round(24.4897959, 1)).toBe(24.5)
    expect(round(1234.5678, 2)).toBe(1234.57)
    expect(round(2.5)).toBe(3)
    expect(round(0.4)).toBe(0)
    expect(round(-0.4)).toBe(-0)
  })
})

describe('IMC (OMS, 2000)', () => {
  it.each([
    [75, 175, 24.489795918367346],
    [90, 180, 27.777777777777775],
    [60, 160, 23.437499999999996],
    [50, 170, 17.301038062283737],
    [110, 175, 35.91836734693877]
  ])('%i kg, %i cm => %f (ref)', (kg, cm, expected) => {
    expect(computeBMI(kg, cm)).toBe(expected)
  })

  it('arredondado a 1 casa bate com os exemplos do design', () => {
    expect(round(computeBMI(75, 175), 1)).toBe(24.5)
    expect(round(computeBMI(90, 180), 1)).toBe(27.8)
    expect(round(computeBMI(60, 160), 1)).toBe(23.4)
  })

  it('valores extremos mas válidos', () => {
    expect(computeBMI(300, 230)).toBe(56.71077504725899)
    expect(computeBMI(30, 100)).toBe(30)
    expect(computeBMI(45, 180)).toBe(13.888888888888888)
  })

  it('é determinístico (idempotência, Req 1.12)', () => {
    expect(computeBMI(82.3, 178)).toBe(computeBMI(82.3, 178))
  })

  it('classifica nos limites da OMS (limite inferior inclusivo)', () => {
    const label = (b: number) => classifyBMI(b).label
    expect(label(17)).toBe('Abaixo do peso')
    expect(label(18.4999)).toBe('Abaixo do peso')
    expect(label(18.5)).toBe('Peso normal')
    expect(label(24.9999)).toBe('Peso normal')
    expect(label(25)).toBe('Sobrepeso')
    expect(label(29.9999)).toBe('Sobrepeso')
    expect(label(30)).toBe('Obesidade grau I')
    expect(label(34.9999)).toBe('Obesidade grau I')
    expect(label(35)).toBe('Obesidade grau II')
    expect(label(39.9999)).toBe('Obesidade grau II')
    expect(label(40)).toBe('Obesidade grau III')
    expect(label(56.7)).toBe('Obesidade grau III')
  })

  it('cada faixa tem a cor esperada', () => {
    expect(classifyBMI(17).tone).toBe('warn')
    expect(classifyBMI(22).tone).toBe('good')
    expect(classifyBMI(27).tone).toBe('warn')
    expect(classifyBMI(32).tone).toBe('bad')
    expect(classifyBMI(37).tone).toBe('bad')
    expect(classifyBMI(45).tone).toBe('bad')
  })
})

describe('TMB e TDEE (Mifflin-St Jeor, 1990)', () => {
  it.each([
    ['male', 80, 180, 30, 1780],
    ['female', 60, 165, 25, 1345.25],
    ['male', 70, 175, 40, 1598.75],
    ['female', 55, 160, 50, 1139],
    ['male', 150, 200, 18, 2665],
    ['female', 40, 140, 80, 714]
  ] as const)('%s %i kg %i cm %i anos => %f kcal (ref)', (sex, kg, cm, age, expected) => {
    expect(computeBMR(sex, kg, cm, age)).toBe(expected)
  })

  it('para as mesmas medidas, homem tem exatamente 166 kcal a mais que mulher (5 − (−161))', () => {
    expect(computeBMR('male', 70, 170, 35) - computeBMR('female', 70, 170, 35)).toBe(166)
  })

  it('TDEE = TMB × fator de atividade', () => {
    expect(round(computeTDEE(1800, 1.2))).toBe(2160)
    expect(round(computeTDEE(1800, 1.375))).toBe(2475)
    expect(round(computeTDEE(1800, 1.55))).toBe(2790)
    expect(round(computeTDEE(1800, 1.725))).toBe(3105)
    expect(round(computeTDEE(1800, 1.9))).toBe(3420)
  })
})

describe('Proteína (ISSN, 2017)', () => {
  it.each([
    ['maintenance', 1.4, 1.8, 112, 144],
    ['hypertrophy', 1.6, 2.2, 128, 176],
    ['fatloss', 1.8, 2.4, 144, 192],
    ['endurance', 1.2, 1.6, 96, 128]
  ] as const)('%s para 80 kg', (goal, perMin, perMax, min, max) => {
    const r = proteinRange(80, goal)
    expect(r.perKgMin).toBe(perMin)
    expect(r.perKgMax).toBe(perMax)
    expect(r.min).toBeCloseTo(min, 9)
    expect(r.max).toBeCloseTo(max, 9)
    expect(r.min).toBeLessThan(r.max)
  })

  it('todas as faixas ficam entre 1,2 e 2,4 g/kg (Req 1.3)', () => {
    for (const goal of ['maintenance', 'hypertrophy', 'fatloss', 'endurance'] as const) {
      const r = proteinRange(1, goal)
      expect(r.perKgMin).toBeGreaterThanOrEqual(1.2)
      expect(r.perKgMax).toBeLessThanOrEqual(2.4)
    }
  })

  it('objetivo desconhecido (inclusive nomes herdados do Object) usa manutenção', () => {
    const maintenance = proteinRange(80, 'maintenance')
    for (const goal of ['xyz', '', 'toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      expect(proteinRange(80, goal as never)).toEqual(maintenance)
    }
  })
})

describe('% de gordura (US Navy, 1984)', () => {
  it.each([
    [180, 40, 90, 18.367495150229843],
    [175, 38, 80, 12.869153742691765],
    [190, 45, 110, 26.532151110526172],
    [165, 36, 75, 11.923107457507058]
  ])('homem altura %i pescoço %i cintura %i => %f (ref)', (h, neck, waist, expected) => {
    expect(bodyFatNavy('male', h, neck, waist)).toBe(expected)
    // o quadril é ignorado no homem
    expect(bodyFatNavy('male', h, neck, waist, 999)).toBe(expected)
  })

  it.each([
    [165, 32, 75, 95, 27.425639348204186],
    [170, 34, 80, 100, 30.06557382174043],
    [158, 30, 70, 92, 26.232845869642404],
    [175, 33, 85, 105, 33.94254467488105]
  ])('mulher altura %i pescoço %i cintura %i quadril %i => %f (ref)', (h, neck, waist, hip, expected) => {
    expect(bodyFatNavy('female', h, neck, waist, hip)).toBe(expected)
  })

  it('devolve NaN quando o logaritmo é indefinido', () => {
    expect(bodyFatNavy('male', 175, 40, 40)).toBeNaN() // cintura = pescoço
    expect(bodyFatNavy('male', 175, 40, 30)).toBeNaN() // cintura < pescoço
    expect(bodyFatNavy('female', 165, 100, 20, 20)).toBeNaN() // cintura + quadril <= pescoço
    expect(bodyFatNavy('female', 165, 33, 70)).toBeNaN() // mulher sem quadril
  })

  it('classifica nos limites de cada sexo', () => {
    const label = (bf: number, sex: 'male' | 'female') => classifyBodyFat(bf, sex).label
    // homem: 6 / 14 / 18 / 25
    expect(label(5.9, 'male')).toBe('Muito baixo (atenção)')
    expect(label(6, 'male')).toBe('Atlético')
    expect(label(14, 'male')).toBe('Bom / fitness')
    expect(label(18, 'male')).toBe('Médio')
    expect(label(25, 'male')).toBe('Acima do recomendado')
    // mulher: 14 / 21 / 25 / 32
    expect(label(13.9, 'female')).toBe('Muito baixo (atenção)')
    expect(label(14, 'female')).toBe('Atlético')
    expect(label(21, 'female')).toBe('Bom / fitness')
    expect(label(25, 'female')).toBe('Médio')
    expect(label(32, 'female')).toBe('Acima do recomendado')
  })

  it('cores das classificações', () => {
    expect(classifyBodyFat(3, 'male').tone).toBe('warn')
    expect(classifyBodyFat(10, 'male').tone).toBe('good')
    expect(classifyBodyFat(16, 'male').tone).toBe('good')
    expect(classifyBodyFat(20, 'male').tone).toBe('warn')
    expect(classifyBodyFat(30, 'male').tone).toBe('bad')
  })
})

describe('1RM (Brzycki 1993 / Epley 1985)', () => {
  it.each([
    [100, 0, 100],
    [100, 1, 100],
    [100, 5, 112.5],
    [100, 10, 133.333333333333],
    [100, 11, 136.666666666667],
    [100, 12, 140],
    [100, 15, 150],
    [100, 20, 166.666666666667],
    [80, 3, 84.7058823529412],
    [60, 8, 74.4827586206897],
    [0, 5, 0]
  ])('%f kg x %i reps => %f (ref)', (kg, reps, expected) => {
    expect(compute1RM(kg, reps)).toBeCloseTo(expected, 9)
  })

  it('Brzycki até 10 reps e Epley a partir de 11', () => {
    expect(compute1RM(100, 10)).toBe(100 * (36 / 27))
    expect(compute1RM(100, 11)).toBe(100 * (1 + 11 / 30))
  })

  it('é crescente com as repetições e com a carga', () => {
    let previous = 0
    for (let reps = 1; reps <= 20; reps++) {
      const rm = compute1RM(100, reps)
      expect(rm).toBeGreaterThanOrEqual(previous)
      previous = rm
    }
    expect(compute1RM(110, 8)).toBeGreaterThan(compute1RM(100, 8))
  })

  it('tabela de percentuais: 9 linhas de 100% a 60%', () => {
    const table = generate1RMTable(125)
    expect(table.map(r => r.pct)).toEqual([100, 95, 90, 85, 80, 75, 70, 65, 60])
    expect(table.map(r => r.reps)).toEqual(['1', '2', '4', '6', '8', '10', '12', '15', '18'])
    expect(table[0]!.load).toBe(125)
    expect(table[4]!.load).toBe(100)
    expect(table[8]!.load).toBe(75)
    for (let i = 1; i < table.length; i++) expect(table[i]!.load).toBeLessThan(table[i - 1]!.load)
  })
})

describe('Frequência cardíaca (Tanaka 2001 / Karvonen 1957)', () => {
  it('FC máxima = 208 − 0,7 × idade', () => {
    expect(maxHeartRate(30)).toBe(187)
    expect(maxHeartRate(45)).toBe(176.5)
    expect(maxHeartRate(60)).toBe(166)
  })

  it('Karvonen = (FCmáx − FCrep) × intensidade + FCrep', () => {
    expect(karvonen(187, 60, 0.5)).toBe(123.5)
    expect(karvonen(187, 60, 1)).toBe(187)
    expect(karvonen(187, 60, 0)).toBe(60)
  })

  it.each([
    [30, 60, 187, ['124-136', '136-149', '149-162', '162-174', '174-187']],
    [20, 50, 194, ['122-136', '136-151', '151-165', '165-180', '180-194']],
    [45, 70, 176.5, ['123-134', '134-145', '145-155', '155-166', '166-177']],
    [60, 65, 166, ['116-126', '126-136', '136-146', '146-156', '156-166']]
  ])('idade %i, repouso %i => FCmáx %f (ref)', (age, rest, max, zones) => {
    const result = hrZones(age, rest)
    expect(result.max).toBe(max)
    expect(result.zones.map(z => `${z.min}-${z.max}`)).toEqual(zones)
  })

  it('5 zonas nomeadas, contíguas e com as cores esperadas', () => {
    const { zones } = hrZones(30, 60)
    expect(zones.map(z => z.name)).toEqual([
      'Z1 — Recuperação',
      'Z2 — Base aeróbica',
      'Z3 — Aeróbico',
      'Z4 — Limiar',
      'Z5 — Máximo'
    ])
    expect(zones.map(z => z.tone)).toEqual(['info', 'good', 'good', 'warn', 'bad'])
    for (let i = 1; i < zones.length; i++) expect(zones[i]!.min).toBe(zones[i - 1]!.max)
  })

  it('a FC máxima cai com a idade e a zona 5 termina nela', () => {
    expect(maxHeartRate(20)).toBeGreaterThan(maxHeartRate(60))
    const r = hrZones(40, 55)
    expect(r.zones[4]!.max).toBe(Math.round(r.max))
  })
})

describe('Hidratação (ACSM, 2007)', () => {
  it.each([
    [70, 0, 2450, 0, 2450],
    [70, 60, 2450, 700, 3150],
    [80, 90, 2800, 1050, 3850],
    [55, 30, 1925, 350, 2275]
  ])('%i kg, %i min de exercício', (kg, minutes, base, exercise, total) => {
    expect(waterIntake(kg, minutes)).toEqual({ base, exercise, total })
  })

  it('total = base + exercício', () => {
    const w = waterIntake(63.5, 47)
    expect(w.total).toBe(w.base + w.exercise)
  })
})

describe('Pace e Riegel (1981)', () => {
  it.each([
    [10, 50, 5],
    [5, 25, 5],
    [21.0975, 105, 4.976892996800569],
    [42.195, 240, 5.6878777106292215]
  ])('%f km em %f min => %f min/km (ref)', (km, min, expected) => {
    expect(pace(km, min)).toBe(expected)
  })

  it.each([
    [50, 10, 42.195, 230.0099666628293],
    [50, 10, 21.0975, 110.32015405342617],
    [25, 5, 10, 52.12328804205607],
    [105, 21.0975, 42.195, 218.9178097766355]
  ])('t1=%f d1=%f d2=%f => %f (ref)', (t1, d1, d2, expected) => {
    expect(riegelProjection(t1, d1, d2)).toBe(expected)
  })

  it('mesma distância devolve o mesmo tempo; distância maior leva mais tempo e é mais que proporcional', () => {
    expect(riegelProjection(50, 10, 10)).toBe(50)
    const marathon = riegelProjection(50, 10, 42.195)
    expect(marathon).toBeGreaterThan(50)
    expect(marathon).toBeGreaterThan(50 * (42.195 / 10)) // expoente 1,06 > 1
  })

  it('formatPace usa m:ss', () => {
    expect(formatPace(4.5)).toBe('4:30')
    expect(formatPace(5)).toBe('5:00')
    expect(formatPace(5.25)).toBe('5:15')
    expect(formatPace(6.1666667)).toBe('6:10')
    expect(formatPace(3)).toBe('3:00')
    expect(formatPace(0)).toBe('0:00')
  })

  it('formatPace não repete o bug do original (4,999 virava "4:00")', () => {
    expect(formatPace(4.999)).toBe('5:00')
    expect(formatPace(5.9999)).toBe('6:00')
    expect(formatPace(9.99999)).toBe('10:00')
  })

  it('formatPace de valor inválido devolve "--:--"', () => {
    expect(formatPace(NaN)).toBe('--:--')
    expect(formatPace(Infinity)).toBe('--:--')
    expect(formatPace(-1)).toBe('--:--')
  })

  it('formatTime usa "Xh Ymin ZZs" (horas só quando houver)', () => {
    expect(formatTime(0.5)).toBe('0min 30s')
    expect(formatTime(50)).toBe('50min 00s')
    expect(formatTime(65.1166667)).toBe('1h 5min 07s')
    expect(formatTime(105)).toBe('1h 45min 00s')
    expect(formatTime(240)).toBe('4h 0min 00s')
    expect(formatTime(125.5)).toBe('2h 5min 30s')
  })

  it('formatTime não repete o bug do original (12,999 virava "12min 60s")', () => {
    expect(formatTime(12.999)).toBe('13min 00s')
    expect(formatTime(59.9999)).toBe('1h 0min 00s')
  })

  it('formatTime de valor inválido devolve "--"', () => {
    expect(formatTime(NaN)).toBe('--')
    expect(formatTime(-5)).toBe('--')
    expect(formatTime(Infinity)).toBe('--')
  })
})

describe('useScience e referências', () => {
  it('devolve sempre o mesmo objeto imutável, sem estado', () => {
    const a = useScience()
    expect(useScience()).toBe(a)
    expect(Object.isFrozen(a)).toBe(true)
  })

  it('expõe todas as funções exigidas pela Task 7.1', () => {
    const s = useScience()
    for (const name of [
      'round', 'computeBMI', 'classifyBMI', 'computeBMR', 'computeTDEE', 'proteinRange',
      'bodyFatNavy', 'compute1RM', 'generate1RMTable', 'hrZones', 'waterIntake', 'pace', 'riegelProjection'
    ] as const) {
      expect(typeof s[name], name).toBe('function')
    }
    expect(s.computeBMI).toBe(computeBMI)
  })

  it('as 13 citações têm autores, título e fonte, sem HTML', () => {
    const entries = Object.entries(SCIENCE_REFERENCES)
    expect(entries).toHaveLength(13)
    for (const [key, ref] of entries) {
      expect(ref.authors.length, key).toBeGreaterThan(3)
      expect(ref.title.length, key).toBeGreaterThan(3)
      expect(ref.source.length, key).toBeGreaterThan(3)
      expect(`${ref.authors}${ref.title}${ref.source}`, key).not.toMatch(/[<>]/)
    }
    expect(useScience().references).toBe(SCIENCE_REFERENCES)
  })
})