// Monta o resultado da calculadora de calorias (Task 7.6). Funções puras: testáveis sem Vue/Nuxt.

import type { ActivityLevel } from '../types/api'
import type { Sex } from '../types/calculators'
import type { ResultCard, ResultHeadline, ResultTable } from '../types/calculator-ui'
import { computeBMR, computeTDEE, round } from '../composables/useScience'
import { formatNumber } from './format'

export interface ActivityLevelInfo {
  /** Valor do campo de seleção (o próprio fator, como texto). */
  value: string
  factor: number
  label: string
  description: string
  /** Chave equivalente no perfil de saúde salvo na API (usada no pré-preenchimento, Task 8.2). */
  profileKey: ActivityLevel
}

/** Fatores de atividade usados com a TMB (multiplicadores convencionais). */
export const ACTIVITY_LEVELS: ReadonlyArray<ActivityLevelInfo> = [
  { value: '1.2', factor: 1.2, label: 'Sedentário', description: 'pouco ou nenhum exercício', profileKey: 'sedentary' },
  { value: '1.375', factor: 1.375, label: 'Leve', description: '1 a 3 treinos por semana', profileKey: 'lightly_active' },
  { value: '1.55', factor: 1.55, label: 'Moderado', description: '3 a 5 treinos por semana', profileKey: 'moderately_active' },
  { value: '1.725', factor: 1.725, label: 'Intenso', description: '6 a 7 treinos por semana', profileKey: 'very_active' },
  { value: '1.9', factor: 1.9, label: 'Muito intenso', description: 'trabalho físico + treino pesado', profileKey: 'extremely_active' }
]

/** Nível usado como padrão no formulário. */
export const DEFAULT_ACTIVITY = '1.55'

/** Ajustes diários sobre o gasto total (kcal). */
export const DEFICIT_KCAL = 500
export const SURPLUS_KCAL = 300

export const CALORIES_NOTE =
  'Um déficit de 500 kcal por dia equivale, em média, a cerca de 0,4 a 0,5 kg de perda por semana. Ajuste conforme a sua evolução de 2 a 3 semanas.'

export const BELOW_BMR_WARNING =
  'Atenção: o déficit sugerido fica abaixo da sua TMB. Não reduza as calorias abaixo da TMB sem acompanhamento de um nutricionista ou médico.'

export interface CaloriesInput {
  sex: Sex
  weight_kg: number
  height_cm: number
  age: number
  activityFactor: number
}

export interface CaloriesResult {
  headline: ResultHeadline
  cards: ResultCard[]
  table: ResultTable
  note: string
  /** true quando o déficit sugerido fica abaixo da TMB. */
  deficitBelowBmr: boolean
}

const kcal = (value: number) => `${formatNumber(value)} kcal`

/**
 * TMB (Mifflin-St Jeor), gasto total (TDEE) e metas para emagrecer, manter ou ganhar peso.
 * Os ajustes (−500 e +300 kcal) são os do site antigo. Valores arredondados para kcal inteira.
 */
export function buildCaloriesResult(input: CaloriesInput): CaloriesResult {
  const bmr = computeBMR(input.sex, input.weight_kg, input.height_cm, input.age)
  const tdee = computeTDEE(bmr, input.activityFactor)

  const maintenance = round(tdee)
  const deficit = round(tdee - DEFICIT_KCAL)
  const surplus = round(tdee + SURPLUS_KCAL)
  const bmrRounded = round(bmr)
  const deficitBelowBmr = deficit < bmrRounded

  return {
    headline: {
      label: 'Gasto calórico diário estimado (TDEE)',
      value: maintenance,
      unit: 'kcal',
      status: 'Manutenção de peso',
      tone: 'good'
    },
    cards: [
      { label: 'TMB (em repouso)', value: bmrRounded, unit: 'kcal', tone: 'info' },
      { label: 'Fator de atividade', value: `×${formatNumber(input.activityFactor, 3)}` }
    ],
    table: {
      caption: 'Calorias por dia conforme o objetivo',
      head: ['Objetivo', 'Calorias por dia', 'Ajuste'],
      rows: [
        ['Perder gordura (déficit moderado)', kcal(deficit), `−${DEFICIT_KCAL} kcal`],
        ['Manter o peso', kcal(maintenance), 'Sem ajuste'],
        ['Ganhar massa (superávit leve)', kcal(surplus), `+${SURPLUS_KCAL} kcal`]
      ]
    },
    note: deficitBelowBmr ? `${CALORIES_NOTE} ${BELOW_BMR_WARNING}` : CALORIES_NOTE,
    deficitBelowBmr
  }
}