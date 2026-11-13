import { describe, it, expect } from 'vitest'
import { formatNumber } from '../../utils/format'

describe('formatNumber (pt-BR)', () => {
  it('usa vírgula decimal', () => {
    expect(formatNumber(24.5)).toBe('24,5')
    expect(formatNumber(0.4)).toBe('0,4')
    expect(formatNumber(-3.25)).toBe('-3,25')
  })

  it('usa ponto como separador de milhar', () => {
    expect(formatNumber(1850)).toBe('1.850')
    expect(formatNumber(1234567.5)).toBe('1.234.567,5')
  })

  it('não completa com zeros e limita as casas (padrão 2)', () => {
    expect(formatNumber(24)).toBe('24')
    expect(formatNumber(24.123456)).toBe('24,12')
    expect(formatNumber(24.126)).toBe('24,13')
    expect(formatNumber(24.126, 0)).toBe('24')
    expect(formatNumber(24.126, 3)).toBe('24,126')
  })

  it('zero e valores não finitos', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(NaN)).toBe('--')
    expect(formatNumber(Infinity)).toBe('--')
    expect(formatNumber(-Infinity)).toBe('--')
  })

  it('minDecimals completa com zeros (faixas de peso: 72 vira "72,0")', () => {
    expect(formatNumber(72, 1, 1)).toBe('72,0')
    expect(formatNumber(53.5, 1, 1)).toBe('53,5')
    expect(formatNumber(1850, 2, 2)).toBe('1.850,00')
    expect(formatNumber(5, 1, 3)).toBe('5,0') // mínimo nunca passa do máximo
  })
})
