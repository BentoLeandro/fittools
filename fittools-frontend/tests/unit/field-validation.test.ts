import { describe, it, expect } from 'vitest'
import {
  applyDefaults,
  isFieldVisible,
  parseDecimal,
  parseValues,
  validateField,
  validateForm
} from '../../utils/field-validation'
import type { FieldConfig, NumberFieldConfig } from '../../types/calculator-ui'

const weight: NumberFieldConfig = { type: 'number', name: 'kg', label: 'Peso', unit: 'kg', min: 25, max: 350 }
const age: NumberFieldConfig = { type: 'number', name: 'age', label: 'Idade', unit: 'anos', min: 14, max: 100, integer: true }
const sex: FieldConfig = {
  type: 'radio',
  name: 'sex',
  label: 'Sexo biológico',
  options: [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' }
  ]
}
const activity: FieldConfig = {
  type: 'select',
  name: 'act',
  label: 'Nível de atividade',
  default: '1.55',
  options: [
    { value: '1.2', label: 'Sedentário' },
    { value: '1.55', label: 'Moderado' }
  ]
}
const hip: NumberFieldConfig = {
  type: 'number',
  name: 'hip',
  label: 'Quadril',
  unit: 'cm',
  min: 50,
  max: 200,
  showIf: v => v.sex === 'female'
}

describe('parseDecimal', () => {
  it('aceita ponto e vírgula como separador decimal', () => {
    expect(parseDecimal('75')).toBe(75)
    expect(parseDecimal('75.5')).toBe(75.5)
    expect(parseDecimal('75,5')).toBe(75.5)
    expect(parseDecimal('  80,25  ')).toBe(80.25)
    expect(parseDecimal('0,4')).toBe(0.4)
    expect(parseDecimal('-3')).toBe(-3)
  })

  it('rejeita o que não é número simples', () => {
    for (const bad of ['', '   ', 'abc', '12abc', '1e3', '0x10', 'Infinity', 'NaN', '1,2,3', '1.000,5', '7 5', ',5', '5,', '--1', '+5']) {
      expect(parseDecimal(bad), JSON.stringify(bad)).toBeNaN()
    }
  })

  it('rejeita número grande demais para ser finito e valores não-texto', () => {
    expect(parseDecimal('9'.repeat(400))).toBeNaN()
    expect(parseDecimal(undefined)).toBeNaN()
    expect(parseDecimal(null)).toBeNaN()
  })
})

describe('validateField (número)', () => {
  it('aceita valores dentro da faixa, inclusive nos limites', () => {
    expect(validateField(weight, '75')).toBeNull()
    expect(validateField(weight, '75,5')).toBeNull()
    expect(validateField(weight, '25')).toBeNull()
    expect(validateField(weight, '350')).toBeNull()
  })

  it('campo obrigatório vazio pede o preenchimento citando o campo', () => {
    expect(validateField(weight, '')).toBe('Preencha o campo Peso.')
    expect(validateField(weight, undefined)).toBe('Preencha o campo Peso.')
    expect(validateField(weight, '   ')).toBe('Preencha o campo Peso.')
  })

  it('campo opcional vazio é válido, mas preenchido fora da faixa não é', () => {
    const optional = { ...weight, required: false }
    expect(validateField(optional, '')).toBeNull()
    expect(validateField(optional, '10')).toBe('Peso deve estar entre 25 e 350 kg.')
  })

  it('texto inválido recebe mensagem de formato', () => {
    expect(validateField(weight, 'abc')).toBe('Digite apenas números, usando vírgula ou ponto para decimais.')
    expect(validateField(weight, '1e2')).toBe('Digite apenas números, usando vírgula ou ponto para decimais.')
  })

  it('fora da faixa diz os limites, com unidade e vírgula decimal', () => {
    expect(validateField(weight, '24.9')).toBe('Peso deve estar entre 25 e 350 kg.')
    expect(validateField(weight, '351')).toBe('Peso deve estar entre 25 e 350 kg.')
    expect(validateField(weight, '-5')).toBe('Peso deve estar entre 25 e 350 kg.')
    const distance: NumberFieldConfig = { type: 'number', name: 'km', label: 'Distância', unit: 'km', min: 0.4, max: 300 }
    expect(validateField(distance, '0,3')).toBe('Distância deve estar entre 0,4 e 300 km.')
  })

  it('só mínimo ou só máximo geram mensagens próprias', () => {
    expect(validateField({ ...weight, max: undefined }, '10')).toBe('Peso deve ser de pelo menos 25 kg.')
    expect(validateField({ ...weight, min: undefined }, '999')).toBe('Peso deve ser de no máximo 350 kg.')
    expect(validateField({ ...weight, min: undefined, max: undefined }, '999')).toBeNull()
  })

  it('campo inteiro rejeita decimais', () => {
    expect(validateField(age, '28')).toBeNull()
    expect(validateField(age, '28,5')).toBe('Use um número inteiro, sem casas decimais.')
    expect(validateField(age, '13')).toBe('Idade deve estar entre 14 e 100 anos.')
  })

  it('sem unidade a mensagem não deixa espaço sobrando', () => {
    const reps: NumberFieldConfig = { type: 'number', name: 'r', label: 'Repetições', min: 1, max: 20 }
    expect(validateField(reps, '25')).toBe('Repetições deve estar entre 1 e 20.')
  })
})

describe('validateField (opções)', () => {
  it('exige escolha e só aceita valores da lista', () => {
    expect(validateField(sex, '')).toBe('Selecione uma opção em Sexo biológico.')
    expect(validateField(sex, undefined)).toBe('Selecione uma opção em Sexo biológico.')
    expect(validateField(sex, 'male')).toBeNull()
    expect(validateField(sex, 'other')).toBe('Escolha uma das opções disponíveis.')
    expect(validateField(activity, '1.55')).toBeNull()
    expect(validateField(activity, '9')).toBe('Escolha uma das opções disponíveis.')
  })

  it('opção opcional pode ficar vazia', () => {
    expect(validateField({ ...sex, required: false }, '')).toBeNull()
  })
})

describe('validateForm / campos condicionais', () => {
  const fields = [sex, weight, hip]

  it('formulário válido devolve objeto vazio', () => {
    expect(validateForm(fields, { sex: 'male', kg: '80' })).toEqual({})
  })

  it('campo escondido por showIf não é validado', () => {
    expect(isFieldVisible(hip, { sex: 'male' })).toBe(false)
    expect(validateForm(fields, { sex: 'male', kg: '80' })).not.toHaveProperty('hip')
  })

  it('campo condicional aparece e passa a ser exigido', () => {
    expect(isFieldVisible(hip, { sex: 'female' })).toBe(true)
    expect(validateForm(fields, { sex: 'female', kg: '80' })).toEqual({ hip: 'Preencha o campo Quadril.' })
    expect(validateForm(fields, { sex: 'female', kg: '80', hip: '96' })).toEqual({})
  })

  it('reúne todos os erros de uma vez', () => {
    expect(Object.keys(validateForm(fields, { kg: 'x' })).sort()).toEqual(['kg', 'sex'])
  })
})

describe('parseValues', () => {
  const fields = [sex, weight, age, { ...weight, name: 'opt', label: 'Opcional', required: false } as FieldConfig, hip]

  it('converte números (com vírgula) e mantém texto nas opções', () => {
    expect(parseValues(fields, { sex: 'female', kg: '75,5', age: '28', hip: '96' })).toEqual({
      sex: 'female',
      kg: 75.5,
      age: 28,
      opt: undefined,
      hip: 96
    })
  })

  it('omite campos escondidos', () => {
    const parsed = parseValues(fields, { sex: 'male', kg: '80', age: '30', hip: '99' })
    expect(parsed).not.toHaveProperty('hip')
  })
})

describe('applyDefaults', () => {
  it('preenche só o que está vazio e não altera a entrada', () => {
    const original = { kg: '80' }
    const result = applyDefaults([activity, weight], original)
    expect(result).toEqual({ kg: '80', act: '1.55' })
    expect(original).toEqual({ kg: '80' })
    expect(applyDefaults([activity], { act: '1.2' })).toEqual({ act: '1.2' })
    expect(applyDefaults([activity], { act: '' })).toEqual({ act: '1.55' })
  })
})