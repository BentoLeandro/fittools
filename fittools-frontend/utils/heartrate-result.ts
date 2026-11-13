// Monta o resultado da calculadora de frequência cardíaca (Task 7.10). Funções puras.

import type { ResultCard, ResultHeadline } from '../types/calculator-ui'
import { hrZones, round } from '../composables/useScience'

export const HEART_RATE_NOTE =
  'Zonas calculadas pelo método Karvonen (FC de Reserva). A Zona 2 é a mais usada para construir base aeróbica.'

export interface HeartRateResult {
  headline: ResultHeadline
  cards: ResultCard[]
  note: string
}

/** FC máxima (Tanaka) e as 5 zonas de treino (Karvonen), com a faixa em bpm de cada uma. */
export function buildHeartRateResult(age: number, restingHR: number): HeartRateResult {
  const result = hrZones(age, restingHR)
  return {
    headline: {
      label: 'Frequência cardíaca máxima estimada',
      value: round(result.max),
      unit: 'bpm',
      status: 'Equação de Tanaka',
      tone: 'good'
    },
    cards: result.zones.map(zone => ({
      label: zone.name,
      value: `${zone.min}–${zone.max}`,
      unit: 'bpm',
      tone: zone.tone
    })),
    note: HEART_RATE_NOTE
  }
}

export interface HeartRateZoneGuide {
  title: string
  /** Intensidade em % da FC de reserva (início e fim da zona). */
  from: number
  to: number
  description: string
}

/**
 * Texto de cada zona. Os percentuais são conferidos nos testes contra o cálculo (`hrZones`),
 * para a descrição nunca divergir das faixas mostradas no resultado.
 */
export const HEART_RATE_ZONE_GUIDE: ReadonlyArray<HeartRateZoneGuide> = [
  {
    title: 'Zona 1 — Recuperação ativa',
    from: 50,
    to: 60,
    description: 'Estimula circulação sanguínea, eliminação de metabólitos e regeneração tecidual sem gerar estresse adicional.'
  },
  {
    title: 'Zona 2 — Base aeróbica',
    from: 60,
    to: 70,
    description: 'Otimização metabólica, queima de lipídios e expansão da rede capilar muscular. Sustentável por horas.'
  },
  {
    title: 'Zona 3 — Cardio / ritmo moderado',
    from: 70,
    to: 80,
    description: 'Melhora a capacidade de trabalho cardiovascular e o transporte de oxigênio pelo sistema circulatório.'
  },
  {
    title: 'Zona 4 — Limiar anaeróbico',
    from: 80,
    to: 90,
    description: 'Eleva o limiar de lactato. O corpo aprende a tamponar a acidez muscular em ritmos competitivos.'
  },
  {
    title: 'Zona 5 — Esforço máximo / VO2 máximo',
    from: 90,
    to: 100,
    description: 'Estímulo neuromuscular e respiratório máximo, realizado em formato de tiros curtos e intervalados (HIIT).'
  }
]