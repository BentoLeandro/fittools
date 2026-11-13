// Monta o resultado da calculadora de IMC (Task 7.5). Função pura: testável sem Vue/Nuxt.

import type { ResultCard, ResultHeadline } from '../types/calculator-ui'
import { classifyBMI, computeBMI, round } from '../composables/useScience'
import { formatNumber } from './format'

export const BMI_NOTE =
  'O IMC não distingue massa muscular de gordura. Use junto com a calculadora de percentual de gordura.'

export interface BmiResult {
  headline: ResultHeadline
  cards: ResultCard[]
  note: string
}

/** Limites da faixa "peso normal" da OMS (kg/m²). */
const NORMAL_MIN = 18.5
const NORMAL_MAX = 24.9

/**
 * IMC, classificação da OMS e faixa de peso saudável para a altura informada.
 *
 * A classificação usa o IMC já arredondado a 1 casa, o mesmo valor mostrado na tela e o mesmo
 * formato da tabela da OMS (18,5–24,9 | 25,0–29,9). Assim um IMC de 24,96 aparece como "25,0" e
 * "Sobrepeso", e nunca como "25,0 — Peso normal".
 */
export function buildBmiResult(weight_kg: number, height_cm: number): BmiResult {
  const bmi = round(computeBMI(weight_kg, height_cm), 1)
  const classification = classifyBMI(bmi)

  const heightSquared = Math.pow(height_cm / 100, 2)
  const minWeight = NORMAL_MIN * heightSquared
  const maxWeight = NORMAL_MAX * heightSquared

  // Diferença até a faixa saudável: negativa se está abaixo, positiva se está acima, 0 dentro.
  let difference = '0'
  if (bmi < NORMAL_MIN) difference = `−${formatNumber(round(minWeight - weight_kg, 1), 1, 1)}`
  else if (bmi >= 25) difference = `+${formatNumber(round(weight_kg - maxWeight, 1), 1, 1)}`

  return {
    headline: {
      label: 'Seu IMC',
      value: bmi,
      unit: 'kg/m²',
      status: classification.label,
      tone: classification.tone
    },
    cards: [
      {
        label: 'Faixa de peso saudável',
        value: `${formatNumber(round(minWeight, 1), 1, 1)}–${formatNumber(round(maxWeight, 1), 1, 1)}`,
        unit: 'kg'
      },
      { label: 'Diferença para a faixa', value: difference, unit: 'kg' }
    ],
    note: BMI_NOTE
  }
}