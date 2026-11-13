// Formatação de números para exibição em português do Brasil (Task 7.4).

const formatters = new Map<string, Intl.NumberFormat>()

/**
 * Número no padrão brasileiro: vírgula decimal e ponto como separador de milhar
 * (24.5 vira "24,5"; 1850 vira "1.850"). Mostra no máximo `maxDecimals` casas; por padrão não
 * completa com zeros (24 continua "24"), mas `minDecimals` força um mínimo (72 com 1 vira "72,0").
 * Valor não finito devolve "--".
 */
export function formatNumber(value: number, maxDecimals = 2, minDecimals = 0): string {
  if (!Number.isFinite(value)) return '--'
  const min = Math.min(minDecimals, maxDecimals)
  const key = `${min}-${maxDecimals}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: maxDecimals })
    formatters.set(key, formatter)
  }
  return formatter.format(value)
}