// Monta o resultado da calculadora de hidratação (Task 7.11). Funções puras: testáveis sem Vue/Nuxt.

import type { ResultCard, ResultHeadline } from '../types/calculator-ui'
import { waterIntake } from '../composables/useScience'
import { formatNumber } from './format'

export const WATER_NOTE =
  'Distribua a água ao longo do dia e aumente a ingestão em dias quentes. Pessoas com doença renal ou cardíaca devem seguir a orientação médica.'

export const GLASS_ML = 250
export const BOTTLE_ML = 500

export interface WaterResult {
  headline: ResultHeadline
  cards: ResultCard[]
  note: string
}

/** mL em litros com uma casa decimal e vírgula ("2,5"). Arredonda 3,15 para 3,2. */
const liters = (milliliters: number) => formatNumber(milliliters / 1000, 1, 1)

/**
 * Meta diária de água: base de 35 mL/kg + reposição de 700 mL por hora de treino (ACSM 2007).
 * Sem treino (minutos vazios) a reposição é zero.
 *
 * Diferença em relação ao site antigo: ele usava toFixed(1), que arredondava 3,15 L para "3,1"
 * por causa da representação binária; aqui 3,15 L vira "3,2", e o total sempre bate com a soma
 * dos valores mostrados (2,5 + 0,7 = 3,2).
 */
export function buildWaterResult(weight_kg: number, exerciseMinutes = 0): WaterResult {
  const water = waterIntake(weight_kg, exerciseMinutes)
  return {
    headline: {
      label: 'Meta diária de água',
      value: liters(water.total),
      unit: 'L',
      status: 'Base 35 mL/kg + reposição de treino',
      tone: 'good'
    },
    cards: [
      { label: 'Consumo base', value: liters(water.base), unit: 'L' },
      { label: 'Reposição de suor', value: liters(water.exercise), unit: 'L', tone: 'info' },
      { label: `Copos de ${GLASS_ML} ml`, value: Math.ceil(water.total / GLASS_ML), unit: 'copos' },
      { label: `Garrafas de ${BOTTLE_ML} ml`, value: Math.ceil(water.total / BOTTLE_ML), unit: 'un' }
    ],
    note: WATER_NOTE
  }
}

export interface HydrationTip {
  when: 'antes' | 'durante' | 'depois'
  title: string
  text: string
}

/** Dicas para o treino, a partir do posicionamento do ACSM sobre reposição de líquidos (2007). */
export const HYDRATION_TIPS: ReadonlyArray<HydrationTip> = [
  {
    when: 'antes',
    title: 'Antes do treino',
    text: 'Beba devagar, cerca de 5 a 7 mL por kg de peso, pelo menos 4 horas antes (para quem pesa 70 kg, de 350 a 490 mL). Se a urina estiver escura ou quase não houver, beba um pouco mais cerca de 2 horas antes.'
  },
  {
    when: 'durante',
    title: 'Durante o treino',
    text: 'Beba em pequenos goles para repor o que perde no suor, sem exagerar: beber além do que se perde aumenta o risco de diluir o sódio do sangue (hiponatremia). Em treinos de mais de 1 hora ou com muito suor, bebidas com sódio e carboidrato podem ajudar.'
  },
  {
    when: 'depois',
    title: 'Depois do treino',
    text: 'Reponha o que foi perdido. Uma referência prática é beber cerca de 1,5 L para cada kg de peso perdido no treino (pese-se antes e depois), junto com uma refeição que tenha sódio.'
  }
]