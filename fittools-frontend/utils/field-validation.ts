// Validação dos campos das calculadoras (Task 7.4, Requisitos 1.9 e 9.6).
// Funções puras: sem Vue/Nuxt, testáveis em Node. As mensagens são em português.

import type { FieldConfig, FormValues, ParsedValues } from '../types/calculator-ui'

/** Número com vírgula ou ponto decimal ("75", "75,5", "75.5"). Sem notação científica. */
const DECIMAL = /^-?\d+(?:[.,]\d+)?$/

/**
 * Converte o texto digitado em número. Aceita vírgula decimal (padrão no Brasil).
 * Devolve NaN para vazio, texto, notação científica ("1e3"), "Infinity" ou números enormes.
 */
export function parseDecimal(input: string | undefined | null): number {
  if (typeof input !== 'string') return NaN
  const text = input.trim()
  if (!DECIMAL.test(text)) return NaN
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) ? value : NaN
}

/** Número no formato brasileiro para mensagens (0.4 vira "0,4"). */
function formatPt(n: number): string {
  return String(n).replace('.', ',')
}

/** Campo visível? Campos escondidos por `showIf` não são validados nem enviados. */
export function isFieldVisible(field: FieldConfig, values: FormValues): boolean {
  return field.showIf ? field.showIf(values) : true
}

/** Mensagem de erro do campo, ou null se o valor é aceitável. */
export function validateField(field: FieldConfig, raw: string | undefined): string | null {
  const value = (raw ?? '').trim()
  const optional = field.required === false

  if (field.type !== 'number') {
    if (value === '') return optional ? null : `Selecione uma opção em ${field.label}.`
    return field.options.some(option => option.value === value)
      ? null
      : 'Escolha uma das opções disponíveis.'
  }

  if (value === '') return optional ? null : `Preencha o campo ${field.label}.`

  const n = parseDecimal(value)
  if (Number.isNaN(n)) return 'Digite apenas números, usando vírgula ou ponto para decimais.'
  if (field.integer && !Number.isInteger(n)) return 'Use um número inteiro, sem casas decimais.'

  const unit = field.unit ? ` ${field.unit}` : ''
  const { min, max } = field
  if (min !== undefined && max !== undefined && (n < min || n > max)) {
    return `${field.label} deve estar entre ${formatPt(min)} e ${formatPt(max)}${unit}.`
  }
  if (min !== undefined && n < min) return `${field.label} deve ser de pelo menos ${formatPt(min)}${unit}.`
  if (max !== undefined && n > max) return `${field.label} deve ser de no máximo ${formatPt(max)}${unit}.`
  return null
}

/** Erros por campo, considerando só os campos visíveis. Objeto vazio = formulário válido. */
export function validateForm(fields: FieldConfig[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue
    const error = validateField(field, values[field.name])
    if (error) errors[field.name] = error
  }
  return errors
}

/** Valores prontos para o cálculo: número nos campos numéricos, texto nos demais. Vazio vira undefined. */
export function parseValues(fields: FieldConfig[], values: FormValues): ParsedValues {
  const parsed: ParsedValues = {}
  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue
    const raw = (values[field.name] ?? '').trim()
    if (raw === '') {
      parsed[field.name] = undefined
    } else {
      parsed[field.name] = field.type === 'number' ? parseDecimal(raw) : raw
    }
  }
  return parsed
}

/** Preenche os valores iniciais (`default`) dos campos que ainda não têm valor. */
export function applyDefaults(fields: FieldConfig[], values: FormValues): FormValues {
  const result: FormValues = { ...values }
  for (const field of fields) {
    if (field.default !== undefined && (result[field.name] === undefined || result[field.name] === '')) {
      result[field.name] = field.default
    }
  }
  return result
}