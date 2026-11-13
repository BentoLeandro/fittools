// Monta o resultado da calculadora de proteína (Task 7.7). Funções puras: testáveis sem Vue/Nuxt.

import type { ProteinGoal } from '../types/calculators'
import type { ResultCard, ResultHeadline } from '../types/calculator-ui'
import { proteinRange, round } from '../composables/useScience'
import { formatNumber } from './format'

export interface ProteinGoalInfo {
  value: ProteinGoal
  /** Texto da opção no formulário. */
  label: string
  /** Nome curto para o texto editorial. */
  title: string
}

/** Objetivos, na ordem do formulário. A faixa em g/kg vem de `proteinRange` (fonte única). */
export const PROTEIN_GOALS: ReadonlyArray<ProteinGoalInfo> = [
  { value: 'hypertrophy', label: 'Ganho de massa muscular (Hipertrofia)', title: 'Ganho de massa muscular (hipertrofia)' },
  { value: 'fatloss', label: 'Emagrecimento (Preservar músculo)', title: 'Emagrecimento com preservação muscular' },
  { value: 'maintenance', label: 'Manutenção e saúde', title: 'Manutenção e saúde' },
  { value: 'endurance', label: 'Endurance e corrida', title: 'Atletas de resistência (endurance)' }
]

export const DEFAULT_PROTEIN_GOAL: ProteinGoal = 'hypertrophy'

/** Refeições usadas para dividir a meta (como no site antigo). */
export const MEALS_PER_DAY = 4

/**
 * Proteína por 100 g de frango grelhado e por ovo, usadas nas equivalências do resultado.
 * Frango: TACO 4ª ed. (peito sem pele grelhado, 32,03 g/100 g). Ovo: 12,58 g/100 g (IBGE, 2011)
 * x 50 g por ovo médio = 6,3 g.
 */
export const CHICKEN_PROTEIN_PER_100G = 32
export const EGG_PROTEIN_G = 6.3

export const PROTEIN_NOTE =
  'Distribua a ingestão em 3 a 5 refeições ao longo do dia para manter a síntese proteica elevada.'

/** Explica por que a faixa do emagrecimento é maior que a da hipertrofia (só nesse objetivo). */
export const FATLOSS_NOTE =
  'No déficit calórico a necessidade de proteína é maior, para proteger a massa muscular.'

export interface ProteinResult {
  headline: ResultHeadline
  cards: ResultCard[]
  note: string
}

/** g/kg no formato brasileiro, ex.: 1.6 vira "1,6". */
export const formatPerKg = (value: number) => formatNumber(value, 1)

/** Faixa diária de proteína (gramas) para o peso e o objetivo informados. */
export function buildProteinResult(weight_kg: number, goal: ProteinGoal): ProteinResult {
  const range = proteinRange(weight_kg, goal)
  const middle = (range.min + range.max) / 2

  return {
    headline: {
      label: 'Sua meta diária de proteína',
      value: `${formatNumber(round(range.min))}–${formatNumber(round(range.max))}`,
      unit: 'g',
      status: `${formatPerKg(range.perKgMin)}–${formatPerKg(range.perKgMax)} g por kg`,
      tone: 'good'
    },
    cards: [
      { label: 'Alvo prático', value: round(middle), unit: 'g/dia' },
      { label: `Por refeição (${MEALS_PER_DAY}x)`, value: round(middle / MEALS_PER_DAY), unit: 'g' },
      { label: 'Equivalente em frango grelhado', value: round(middle / (CHICKEN_PROTEIN_PER_100G / 100)), unit: 'g' },
      { label: 'Equivalente em ovos', value: round(middle / EGG_PROTEIN_G), unit: 'un' }
    ],
    note: goal === 'fatloss' ? `${FATLOSS_NOTE} ${PROTEIN_NOTE}` : PROTEIN_NOTE
  }
}

export interface ProteinFood {
  name: string
  /** Proteína por 100 g, em gramas. */
  protein: number
}

/**
 * Proteína por 100 g de alimentos comuns no Brasil, do maior para o menor teor.
 * Fonte: TACO (4ª edição) para carnes, peixe, queijo e leguminosas; tabela do IBGE (2011) para
 * ovo e leite. Valores aproximados: variam com o preparo e a marca.
 */
export const PROTEIN_FOODS: ReadonlyArray<ProteinFood> = [
  { name: 'Carne bovina (patinho) grelhada', protein: 35.9 },
  { name: 'Peito de frango sem pele grelhado', protein: 32 },
  { name: 'Atum em conserva (em óleo)', protein: 26.2 },
  { name: 'Queijo minas frescal', protein: 17.4 },
  { name: 'Ovo de galinha cozido', protein: 12.6 },
  { name: 'Lentilha cozida', protein: 6.3 },
  { name: 'Feijão carioca cozido', protein: 4.8 },
  { name: 'Leite de vaca integral', protein: 3.2 }
]