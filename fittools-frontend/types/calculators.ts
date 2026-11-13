// Tipos das calculadoras (Task 7.1). Sem dependência de Vue/Nuxt: usados pelas fórmulas puras.

import type { Sex } from './api'

export type { Sex }

/** Cor semântica de um resultado (usada pelo Calculator/Result). */
export type Tone = 'good' | 'warn' | 'bad' | 'info'

/** Rótulo + cor de uma classificação (IMC, % de gordura). */
export interface Classification {
  label: string
  tone: Tone
}

export type BMIClassification = Classification
export type BodyFatClassification = Classification

/**
 * Objetivo da calculadora de proteína. Atenção: difere de `FitnessGoal` (perfil na API),
 * que usa weight_loss / muscle_gain / athletic_performance. O pré-preenchimento (Task 8.2)
 * faz a conversão.
 */
export type ProteinGoal = 'maintenance' | 'hypertrophy' | 'fatloss' | 'endurance'

/** Faixa diária de proteína: gramas totais e gramas por kg. */
export interface ProteinRange {
  min: number
  max: number
  perKgMin: number
  perKgMax: number
}

/** Linha da tabela de percentuais de 1RM. */
export interface RMTableRow {
  /** Percentual do 1RM (100, 95, ... 60). */
  pct: number
  /** Carga correspondente, na mesma unidade do 1RM. */
  load: number
  /** Repetições típicas nesse percentual (texto, ex.: "8"). */
  reps: string
}

/** Zona de treino por frequência cardíaca (bpm, arredondado). */
export interface HeartRateZone {
  name: string
  tone: Tone
  min: number
  max: number
}

export interface HeartRateZones {
  /** FC máxima estimada (Tanaka), sem arredondar. */
  max: number
  zones: HeartRateZone[]
}

/** Ingestão diária de água, em mL. */
export interface WaterIntake {
  base: number
  exercise: number
  total: number
}

/** Chaves das referências científicas disponíveis. */
export type ReferenceKey =
  | 'bmi'
  | 'mifflin'
  | 'issn'
  | 'helms'
  | 'navy'
  | 'brzycki'
  | 'epley'
  | 'tanaka'
  | 'karvonen'
  | 'acsm'
  | 'riegel'
  | 'tabata'
  | 'schoenfeld'

/** Citação acadêmica estruturada (renderizada em texto, sem HTML). */
export interface ScientificReference {
  authors: string
  title: string
  source: string
}