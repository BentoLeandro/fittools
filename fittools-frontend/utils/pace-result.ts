// Monta o resultado da calculadora de pace (Task 7.12). Funções puras: testáveis sem Vue/Nuxt.

import type { ResultHeadline, ResultTable } from '../types/calculator-ui'
import { formatPace, formatTime, pace, riegelProjection, round } from '../composables/useScience'
import { formatNumber } from './format'

export const PACE_TIME_REQUIRED_MESSAGE = 'Informe o tempo total gasto na corrida.'
export const PACE_INVALID_MESSAGE =
  'Esses valores parecem incoerentes. Confira a distância (em km) e o tempo informado.'

export const PACE_NOTE =
  'Projeções baseadas na equação de fadiga de Peter Riegel. Ficam menos confiáveis quando a distância informada é muito diferente da prova projetada.'

/**
 * Faixa de pace aceita (min/km). Abaixo de 1:30 é mais rápido que qualquer recorde mundial acima
 * de 400 m; acima de 60 min/km (1 km/h) não é corrida nem caminhada. O site antigo não barrava
 * isso, então 5 km em 5 segundos gerava um resultado sem sentido.
 */
export const MIN_PACE = 1.5
export const MAX_PACE = 60

export interface PaceInput {
  distance_km: number
  hours?: number
  minutes?: number
  seconds?: number
}

/** Distâncias das projeções (km). Meia maratona e maratona usam as medidas oficiais. */
export const PROJECTION_DISTANCES: ReadonlyArray<{ km: number; label: string }> = [
  { km: 5, label: 'Projeção 5 km' },
  { km: 10, label: 'Projeção 10 km' },
  { km: 21.0975, label: 'Meia maratona (21,1 km)' },
  { km: 42.195, label: 'Maratona (42,2 km)' }
]

export interface PaceSuccess {
  ok: true
  headline: ResultHeadline
  table: ResultTable
  note: string
}

export interface PaceFailure {
  ok: false
  error: string
}

export type PaceOutcome = PaceSuccess | PaceFailure

/** Tempo total em minutos a partir de horas, minutos e segundos (campos vazios valem zero). */
export function totalMinutes({ hours = 0, minutes = 0, seconds = 0 }: Pick<PaceInput, 'hours' | 'minutes' | 'seconds'>): number {
  return hours * 60 + minutes + seconds / 60
}

/** Pace médio, velocidade e projeções de tempo para 5 km, 10 km, meia maratona e maratona. */
export function buildPaceResult(input: PaceInput): PaceOutcome {
  const total = totalMinutes(input)
  if (!(total > 0)) return { ok: false, error: PACE_TIME_REQUIRED_MESSAGE }

  const minutesPerKm = pace(input.distance_km, total)
  if (!(minutesPerKm >= MIN_PACE && minutesPerKm <= MAX_PACE)) return { ok: false, error: PACE_INVALID_MESSAGE }

  return {
    ok: true,
    headline: {
      label: 'Seu pace médio',
      value: formatPace(minutesPerKm),
      unit: 'min/km',
      status: `Velocidade média de ${formatNumber(round(60 / minutesPerKm, 1), 1, 1)} km/h`,
      tone: 'good'
    },
    table: {
      caption: 'Tempos e paces previstos para provas de 5 km até a maratona',
      head: ['Prova', 'Tempo previsto', 'Pace previsto'],
      rows: PROJECTION_DISTANCES.map(({ km, label }) => {
        const projected = riegelProjection(total, input.distance_km, km)
        return [label, formatTime(projected), `${formatPace(projected / km)} min/km`]
      })
    },
    note: PACE_NOTE
  }
}

/** Paces de referência (min/km) da tabela de conversão rápida do texto. */
export const REFERENCE_PACES: ReadonlyArray<number> = [6, 5.5, 5, 4.5, 4]

/** Tabela de conversão: pace, velocidade em km/h e tempos de 5 km e 10 km nesse ritmo. */
export function buildPaceConversionTable(): ResultTable {
  return {
    caption: 'Conversão rápida de pace em velocidade e tempos de prova',
    head: ['Pace', 'Velocidade', '5 km', '10 km'],
    rows: REFERENCE_PACES.map(minutesPerKm => [
      `${formatPace(minutesPerKm)} min/km`,
      `${formatNumber(60 / minutesPerKm, 1, 1)} km/h`,
      formatTime(minutesPerKm * 5),
      formatTime(minutesPerKm * 10)
    ])
  }
}