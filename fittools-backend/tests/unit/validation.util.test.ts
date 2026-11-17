import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { registerSchema } from '../../src/schemas/auth.schema'
import { AppError, ConflictError, UnauthorizedError, ValidationError } from '../../src/utils/errors.util'
import { parseOrThrow } from '../../src/utils/validation.util'

function catchError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('Esperava que lançasse um erro')
}

describe('parseOrThrow', () => {
  it('devolve os dados já normalizados pelo schema', () => {
    const data = parseOrThrow(registerSchema, {
      email: ' MARIA@Example.com ',
      password: 'Senha1234',
      name: '  Maria  '
    })
    expect(data).toEqual({ email: 'maria@example.com', password: 'Senha1234', name: 'Maria' })
  })

  it('lança ValidationError (400) com UMA mensagem de texto por campo', () => {
    const error = catchError(() => parseOrThrow(registerSchema, { email: 'x', password: 'abc', name: '' }))
    expect(error).toBeInstanceOf(ValidationError)
    expect(error).toBeInstanceOf(AppError)
    const body = (error as ValidationError).toBody()
    expect((error as ValidationError).statusCode).toBe(400)
    expect(body.error).toBe('ValidationError')
    expect(body.message).toBe('Dados inválidos')
    expect(body.fields).toEqual({
      email: 'Email inválido',
      password: 'Senha deve ter pelo menos 8 caracteres',
      name: 'Nome deve ter pelo menos 2 caracteres'
    })
    for (const value of Object.values(body.fields ?? {})) {
      expect(typeof value).toBe('string')
    }
  })

  it('usa a primeira mensagem quando um campo falha em várias regras', () => {
    // "abc": curta, sem maiúscula e sem número; a mais relevante vem primeiro
    const error = catchError(() => parseOrThrow(registerSchema, { email: 'a@b.com', password: 'abc', name: 'Ana' }))
    expect((error as ValidationError).fields).toEqual({ password: 'Senha deve ter pelo menos 8 caracteres' })
  })

  it('erro do corpo inteiro vira a message da resposta, sem fields', () => {
    const error = catchError(() => parseOrThrow(registerSchema, undefined))
    expect((error as ValidationError).toBody()).toEqual({
      error: 'ValidationError',
      message: 'Corpo da requisição ausente',
      fields: {}
    })
    const notObject = catchError(() => parseOrThrow(registerSchema, 'texto'))
    expect((notObject as ValidationError).message).toBe('Corpo da requisição deve ser um objeto JSON')
  })

  it('campo aninhado usa o caminho com pontos', () => {
    const schema = z.object({ perfil: z.object({ idade: z.number({ invalid_type_error: 'Idade inválida' }) }) })
    const error = catchError(() => parseOrThrow(schema, { perfil: { idade: 'x' } }))
    expect((error as ValidationError).fields).toEqual({ 'perfil.idade': 'Idade inválida' })
  })
})

describe('AppError', () => {
  it('ValidationError e ConflictError têm status, código e corpo corretos', () => {
    expect(new ConflictError('Email já cadastrado').toBody()).toEqual({
      error: 'ConflictError',
      message: 'Email já cadastrado'
    })
    expect(new ConflictError('x').statusCode).toBe(409)
    expect(new ValidationError({ a: 'b' }).toBody()).toEqual({
      error: 'ValidationError',
      message: 'Dados inválidos',
      fields: { a: 'b' }
    })
    expect(new ConflictError('x').name).toBe('ConflictError')
  })

  it('UnauthorizedError é 401 com o código do design', () => {
    const error = new UnauthorizedError('Credenciais inválidas')
    expect(error.statusCode).toBe(401)
    expect(error.toBody()).toEqual({ error: 'UnauthorizedError', message: 'Credenciais inválidas' })
    expect(error).toBeInstanceOf(AppError)
  })

  it('o corpo não tem a chave fields quando ela não existe', () => {
    expect('fields' in new ConflictError('x').toBody()).toBe(false)
  })
})