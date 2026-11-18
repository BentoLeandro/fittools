import { describe, expect, it } from 'vitest'
import { extractBearerToken } from '../../src/middlewares/jwt.middleware'

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiMSJ9.assinatura-qualquer'

describe('extractBearerToken', () => {
  it('extrai o token de "Bearer <token>"', () => {
    expect(extractBearerToken(`Bearer ${TOKEN}`)).toEqual({ ok: true, token: TOKEN })
  })

  it.each(['bearer', 'BEARER', 'BeArEr'])('o esquema "%s" não diferencia maiúsculas (RFC 7235)', (scheme) => {
    expect(extractBearerToken(`${scheme} ${TOKEN}`)).toEqual({ ok: true, token: TOKEN })
  })

  it('aceita mais de um espaço entre o esquema e o token', () => {
    expect(extractBearerToken(`Bearer    ${TOKEN}`)).toEqual({ ok: true, token: TOKEN })
  })

  it.each([undefined, ''])('cabeçalho ausente (%j) é "missing"', (header) => {
    expect(extractBearerToken(header)).toEqual({ ok: false, reason: 'missing' })
  })

  it.each([
    ['só o esquema', 'Bearer'],
    ['esquema e espaço', 'Bearer '],
    ['só o token', TOKEN],
    ['outro esquema', `Basic ${TOKEN}`],
    ['esquema desconhecido', `Token ${TOKEN}`],
    ['dois tokens', `Bearer ${TOKEN} outro`],
    ['token com espaço no meio', 'Bearer abc def'],
    ['tabulação em vez de espaço', `Bearer\t${TOKEN}`],
    ['esquema colado no token', `Bearer${TOKEN}`],
    ['espaço antes do esquema', ` Bearer ${TOKEN}`],
    ['quebra de linha', `Bearer ${TOKEN}\nX-Injetado: 1`],
    ['só espaços', '   ']
  ])('formato inválido: %s', (_nome, header) => {
    expect(extractBearerToken(header)).toEqual({ ok: false, reason: 'malformed' })
  })

  it('é linear: um cabeçalho enorme de espaços não trava (sem ReDoS)', () => {
    const start = performance.now()
    extractBearerToken(`Bearer${' '.repeat(100_000)}`)
    extractBearerToken(`Bearer ${'a'.repeat(100_000)} b`)
    expect(performance.now() - start).toBeLessThan(200)
  })
})