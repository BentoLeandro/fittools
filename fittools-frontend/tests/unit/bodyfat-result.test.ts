import { describe, it, expect } from 'vitest'
import { bodyFatNavy, classifyBodyFat } from '../../composables/useScience'
import {
  BODY_FAT_BANDS,
  BODY_FAT_INVALID_MESSAGE,
  BODY_FAT_MAX,
  BODY_FAT_MIN,
  BODY_FAT_NOTE,
  buildBodyFatResult,
  formatBand
} from '../../utils/bodyfat-result'

// Percentuais obtidos executando o science.js ORIGINAL do site antigo.

describe('buildBodyFatResult', () => {
  it.each([
    // sexo, altura, pescoço, cintura, quadril, % esperado (1 casa), classificação, tom
    ['male', 180, 40, 90, undefined, 18.4, 'Médio', 'warn'],
    ['male', 175, 38, 80, undefined, 12.9, 'Atlético', 'good'],
    ['male', 190, 45, 110, undefined, 26.5, 'Acima do recomendado', 'bad'],
    ['male', 165, 36, 75, undefined, 11.9, 'Atlético', 'good'],
    ['female', 165, 32, 75, 95, 27.4, 'Médio', 'warn'],
    ['female', 170, 34, 80, 100, 30.1, 'Médio', 'warn'],
    ['female', 158, 30, 70, 92, 26.2, 'Médio', 'warn'],
    ['female', 175, 33, 85, 105, 33.9, 'Acima do recomendado', 'bad']
  ] as const)('%s %i cm pescoço %i cintura %i quadril %s', (sex, h, neck, waist, hip, percent, label, tone) => {
    const r = buildBodyFatResult({ sex, height_cm: h, neck_cm: neck, waist_cm: waist, hip_cm: hip })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.headline).toEqual({
      label: 'Percentual de gordura estimado',
      value: percent,
      unit: '%',
      status: label,
      tone
    })
    expect(r.cards).toEqual([{ label: 'Classificação', value: label, tone }])
    expect(r.note).toBe(BODY_FAT_NOTE)
  })

  it('o quadril é ignorado no sexo masculino', () => {
    const a = buildBodyFatResult({ sex: 'male', height_cm: 180, neck_cm: 40, waist_cm: 90 })
    const b = buildBodyFatResult({ sex: 'male', height_cm: 180, neck_cm: 40, waist_cm: 90, hip_cm: 999 })
    expect(a).toEqual(b)
  })

  it('com o peso informado mostra massa gorda e massa magra (80 kg, 18,37%)', () => {
    const r = buildBodyFatResult({ sex: 'male', height_cm: 180, neck_cm: 40, waist_cm: 90, weight_kg: 80 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cards).toEqual([
      { label: 'Classificação', value: 'Médio', tone: 'warn' },
      { label: 'Massa gorda', value: 14.7, unit: 'kg', tone: 'warn' },
      { label: 'Massa magra', value: 65.3, unit: 'kg', tone: 'good' }
    ])
  })

  it('massa gorda + massa magra = peso (com a tolerância do arredondamento)', () => {
    const r = buildBodyFatResult({ sex: 'female', height_cm: 165, neck_cm: 32, waist_cm: 75, hip_cm: 95, weight_kg: 62.3 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const fat = r.cards[1]!.value as number
    const lean = r.cards[2]!.value as number
    expect(Math.abs(fat + lean - 62.3)).toBeLessThanOrEqual(0.1)
  })

  describe('medidas que não geram resultado confiável', () => {
    const invalid = (input: Parameters<typeof buildBodyFatResult>[0]) => {
      const r = buildBodyFatResult(input)
      expect(r).toEqual({ ok: false, error: BODY_FAT_INVALID_MESSAGE })
    }

    it('homem com cintura igual ou menor que o pescoço (logaritmo indefinido)', () => {
      invalid({ sex: 'male', height_cm: 175, neck_cm: 40, waist_cm: 40 })
      invalid({ sex: 'male', height_cm: 175, neck_cm: 40, waist_cm: 30 })
    })

    it('mulher sem o quadril', () => {
      invalid({ sex: 'female', height_cm: 165, neck_cm: 33, waist_cm: 70 })
    })

    it('resultado negativo ou abaixo de 2% (o site antigo só barrava ≤ 0)', () => {
      invalid({ sex: 'male', height_cm: 175, neck_cm: 38, waist_cm: 60 }) // -9,2%
      invalid({ sex: 'male', height_cm: 175, neck_cm: 45, waist_cm: 50 }) // -52,6%
      invalid({ sex: 'female', height_cm: 170, neck_cm: 50, waist_cm: 60, hip_cm: 60 }) // -16,9%
    })

    it('resultado acima de 60%: a fórmula dá valores absurdos nos extremos do formulário', () => {
      const extreme = { sex: 'male', height_cm: 120, neck_cm: 20, waist_cm: 200 } as const
      expect(bodyFatNavy(extreme.sex, extreme.height_cm, extreme.neck_cm, extreme.waist_cm)).toBeGreaterThan(BODY_FAT_MAX)
      invalid(extreme)
    })

    it('limites aceitos: 2% a 60%', () => {
      expect(BODY_FAT_MIN).toBe(2)
      expect(BODY_FAT_MAX).toBe(60)
    })
  })

  it('é determinístico (Req 1.12)', () => {
    const input = { sex: 'female', height_cm: 168, neck_cm: 31.5, waist_cm: 72.5, hip_cm: 98, weight_kg: 64 } as const
    expect(buildBodyFatResult(input)).toEqual(buildBodyFatResult(input))
  })
})

describe('BODY_FAT_BANDS (tabela do texto)', () => {
  const sexes = ['male', 'female'] as const

  it('5 faixas contíguas por sexo, sem lacunas entre o fim de uma e o início da próxima', () => {
    expect(BODY_FAT_BANDS).toHaveLength(5)
    for (const sex of sexes) {
      for (let i = 0; i < BODY_FAT_BANDS.length - 1; i++) {
        const current = BODY_FAT_BANDS[i]![sex]
        const next = BODY_FAT_BANDS[i + 1]![sex]
        expect(current[1], `${sex} faixa ${i}`).toBe(next[0] - 1)
      }
      expect(BODY_FAT_BANDS[4]![sex][1]).toBeNull()
    }
  })

  it('os limites da tabela batem com a classificação do cálculo (não podem divergir)', () => {
    for (const sex of sexes) {
      for (const band of BODY_FAT_BANDS) {
        const [min, max] = band[sex]
        expect(classifyBodyFat(min, sex).label, `${sex} ${band.category} início ${min}`).toBe(band.classification)
        const last = max === null ? min + 30 : max + 0.99
        expect(classifyBodyFat(last, sex).label, `${sex} ${band.category} fim ${last}`).toBe(band.classification)
      }
    }
  })

  it('formatBand', () => {
    expect(formatBand([6, 13])).toBe('6% a 13%')
    expect(formatBand([25, null])).toBe('25% ou mais')
  })
})