// Monta o resultado da calculadora de gordura corporal (Task 7.8). Funções puras: testáveis sem Vue/Nuxt.

import type { Sex } from '../types/calculators'
import type { ResultCard, ResultHeadline } from '../types/calculator-ui'
import { bodyFatNavy, classifyBodyFat, round } from '../composables/useScience'

/** Mensagem do site antigo para medidas que não geram um resultado confiável. */
export const BODY_FAT_INVALID_MESSAGE =
  'Medidas inválidas. Confira se a cintura é maior que o pescoço e se as medidas estão em centímetros.'

export const BODY_FAT_NOTE =
  'Método antropométrico oficial da Marinha dos EUA. Meça sempre em jejum pela manhã.'

/**
 * Faixa aceita para o resultado. Dentro das faixas do formulário a fórmula chega a dar valores
 * absurdos (de −86% a 130%); o site antigo só barrava NaN e valores ≤ 0. Abaixo de 2% (o mínimo
 * essencial é de 2 a 5% nos homens) ou acima de 60% o resultado é tratado como medida inválida.
 */
export const BODY_FAT_MIN = 2
export const BODY_FAT_MAX = 60

export interface BodyFatInput {
  sex: Sex
  height_cm: number
  neck_cm: number
  waist_cm: number
  /** Obrigatório para o sexo feminino; ignorado no masculino. */
  hip_cm?: number
  /** Opcional: com o peso, o resultado traz massa gorda e massa magra. */
  weight_kg?: number
}

export interface BodyFatSuccess {
  ok: true
  headline: ResultHeadline
  cards: ResultCard[]
  note: string
}

export interface BodyFatFailure {
  ok: false
  error: string
}

export type BodyFatOutcome = BodyFatSuccess | BodyFatFailure

/** Percentual de gordura (US Navy), classificação e, se houver peso, massa gorda e magra. */
export function buildBodyFatResult(input: BodyFatInput): BodyFatOutcome {
  const bodyFat = bodyFatNavy(input.sex, input.height_cm, input.neck_cm, input.waist_cm, input.hip_cm)
  if (!Number.isFinite(bodyFat) || bodyFat < BODY_FAT_MIN || bodyFat > BODY_FAT_MAX) {
    return { ok: false, error: BODY_FAT_INVALID_MESSAGE }
  }

  const classification = classifyBodyFat(bodyFat, input.sex)
  const cards: ResultCard[] = [{ label: 'Classificação', value: classification.label, tone: classification.tone }]

  if (input.weight_kg) {
    cards.push({ label: 'Massa gorda', value: round((input.weight_kg * bodyFat) / 100, 1), unit: 'kg', tone: 'warn' })
    cards.push({ label: 'Massa magra', value: round(input.weight_kg * (1 - bodyFat / 100), 1), unit: 'kg', tone: 'good' })
  }

  return {
    ok: true,
    headline: {
      label: 'Percentual de gordura estimado',
      value: round(bodyFat, 1),
      unit: '%',
      status: classification.label,
      tone: classification.tone
    },
    cards,
    note: BODY_FAT_NOTE
  }
}

export interface BodyFatBand {
  category: string
  /** Rótulo que `classifyBodyFat` devolve para esta faixa (usado para conferir a tabela). */
  classification: string
  /** [mínimo, máximo] em %, inteiros; máximo null = sem limite. */
  male: readonly [number, number | null]
  female: readonly [number, number | null]
}

/** Tabela de referência do texto. Os limites são conferidos contra `classifyBodyFat` nos testes. */
export const BODY_FAT_BANDS: ReadonlyArray<BodyFatBand> = [
  { category: 'Essencial / mínimo biológico', classification: 'Muito baixo (atenção)', male: [2, 5], female: [10, 13] },
  { category: 'Atletas', classification: 'Atlético', male: [6, 13], female: [14, 20] },
  { category: 'Boa forma / fitness', classification: 'Bom / fitness', male: [14, 17], female: [21, 24] },
  { category: 'Média populacional', classification: 'Médio', male: [18, 24], female: [25, 31] },
  { category: 'Acima do recomendado', classification: 'Acima do recomendado', male: [25, null], female: [32, null] }
]

/** "6% a 13%" ou "25% ou mais". */
export function formatBand([min, max]: readonly [number, number | null]): string {
  return max === null ? `${min}% ou mais` : `${min}% a ${max}%`
}