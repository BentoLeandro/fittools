// Monta o resultado da calculadora de 1RM (Task 7.9). Funções puras: testáveis sem Vue/Nuxt.

import type { ResultCard, ResultHeadline, ResultTable } from '../types/calculator-ui'
import { compute1RM, generate1RMTable, round } from '../composables/useScience'
import { formatNumber } from './format'

export const ONERM_NOTE =
  'Estimativa para exercícios multiarticulares. Nunca teste 1RM máxima sem auxílio de um parceiro de treino.'

export interface OneRmResult {
  headline: ResultHeadline
  cards: ResultCard[]
  table: ResultTable
  note: string
}

/** Posições da tabela (100%, 95%, ... 60%) usadas nos cartões, como no site antigo. */
const STRENGTH = 3 // 85%
const HYPERTROPHY = 5 // 75%
const ENDURANCE = 7 // 65%
const WARMUP = 8 // 60%

/** Qual fórmula foi usada: 1 repetição é a própria carga; até 10 reps Brzycki; acima, Epley. */
export function oneRmMethod(reps: number): string {
  if (reps <= 1) return 'Carga informada (1 repetição)'
  return reps <= 10 ? 'Fórmula de Brzycki' : 'Fórmula de Epley'
}

/** 1RM estimado e tabela de cargas por percentual (100% a 60%), com carga em kg e reps típicas. */
export function buildOneRmResult(weight_kg: number, reps: number): OneRmResult {
  const oneRm = compute1RM(weight_kg, reps)
  const rows = generate1RMTable(oneRm)
  const load = (index: number) => round(rows[index]!.load, 1)

  return {
    headline: {
      label: '1RM estimado',
      value: round(oneRm, 1),
      unit: 'kg',
      status: oneRmMethod(reps),
      tone: 'good'
    },
    cards: [
      { label: 'Força (85%)', value: load(STRENGTH), unit: `kg ≈ ${rows[STRENGTH]!.reps} reps` },
      { label: 'Hipertrofia (75%)', value: load(HYPERTROPHY), unit: `kg ≈ ${rows[HYPERTROPHY]!.reps} reps` },
      { label: 'Resistência (65%)', value: load(ENDURANCE), unit: `kg ≈ ${rows[ENDURANCE]!.reps} reps` },
      { label: 'Aquecimento (60%)', value: load(WARMUP), unit: 'kg' }
    ],
    table: {
      caption: 'Cargas e repetições estimadas por percentual do 1RM',
      head: ['% do 1RM', 'Carga', 'Reps estimadas'],
      rows: rows.map(row => [`${row.pct}%`, `${formatNumber(round(row.load, 1), 1)} kg`, `~${row.reps}`])
    },
    note: ONERM_NOTE
  }
}