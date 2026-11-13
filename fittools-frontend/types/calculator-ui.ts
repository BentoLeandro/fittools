// Tipos dos componentes de calculadora (Task 7.4). Sem dependência de Vue/Nuxt.

import type { Tone } from './calculators'

/** Valores digitados no formulário, sempre como texto (o parse acontece na validação). */
export type FormValues = Record<string, string | undefined>

/** Valores já convertidos: número nos campos numéricos, texto nos de escolha. */
export type ParsedValues = Record<string, number | string | undefined>

export interface FieldOption {
  value: string
  label: string
}

interface BaseField {
  /** Chave do campo em `FormValues`. */
  name: string
  label: string
  /** Texto de ajuda exibido abaixo do campo. */
  help?: string
  /** Padrão: obrigatório. Use `false` para campos opcionais. */
  required?: boolean
  /** Ocupa as duas colunas do formulário. */
  full?: boolean
  /** Valor inicial (usado quando o formulário ainda não tem valor para o campo). */
  default?: string
  /** Campo só aparece (e só é validado) quando devolve true. Ex.: quadril apenas para mulheres. */
  showIf?: (values: FormValues) => boolean
}

export interface NumberFieldConfig extends BaseField {
  type: 'number'
  /** Unidade mostrada dentro do campo (kg, cm, bpm...). */
  unit?: string
  placeholder?: string
  /** Faixa fisiologicamente plausível (Requisito 1.9). */
  min?: number
  max?: number
  /** Só aceita número inteiro (idade, repetições, minutos). */
  integer?: boolean
}

export interface SelectFieldConfig extends BaseField {
  type: 'select'
  options: FieldOption[]
}

export interface RadioFieldConfig extends BaseField {
  type: 'radio'
  options: FieldOption[]
}

export type FieldConfig = NumberFieldConfig | SelectFieldConfig | RadioFieldConfig

/** Destaque do resultado (o número principal). */
export interface ResultHeadline {
  label: string
  value: string | number
  unit?: string
  /** Texto de classificação, ex.: "Peso normal". */
  status?: string
  tone?: Tone
}

/** Cartão informativo abaixo do destaque. */
export interface ResultCard {
  label: string
  value: string | number
  unit?: string
  tone?: Tone
}

export interface ResultTable {
  /** Descrição da tabela para leitores de tela. */
  caption: string
  head: string[]
  rows: string[][]
}