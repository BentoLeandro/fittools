import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { getTrustProxy } from '../../src/config/proxy'
import { RATE_LIMITS, ipKey } from '../../src/middlewares/rateLimit'
import { AppError, TooManyRequestsError } from '../../src/utils/errors.util'

describe('RATE_LIMITS (design, Requisito 6)', () => {
  it('tem os limites do design', () => {
    expect(RATE_LIMITS.public).toEqual({ max: 60, timeWindow: '15 minutes' })
    expect(RATE_LIMITS.login).toEqual({ max: 5, timeWindow: '15 minutes' })
    expect(RATE_LIMITS.register).toEqual({ max: 3, timeWindow: '60 minutes' })
    expect(RATE_LIMITS.authenticated).toEqual({ max: 300, timeWindow: '15 minutes' })
  })
})

describe('ipKey', () => {
  it.each(['203.0.113.5', '10.0.0.1', '127.0.0.1', '255.255.255.255'])('IPv4 %s fica como está', (ip) => {
    expect(ipKey(ip)).toBe(ip)
  })

  it.each([
    ['::ffff:203.0.113.5', '203.0.113.5'],
    ['::FFFF:203.0.113.5', '203.0.113.5'],
    ['::ffff:127.0.0.1', '127.0.0.1']
  ])('IPv4 dentro de IPv6 (%s) vira o IPv4 (%s)', (ip, expected) => {
    expect(ipKey(ip)).toBe(expected)
  })

  it('o loopback IPv6 (::1) fica como está, para a lista de exceção reconhecê-lo', () => {
    expect(ipKey('::1')).toBe('::1')
  })

  it.each([
    ['2001:db8:1:2::1', '2001:db8:1:2::/64'],
    ['2001:db8:1:2:ffff:ffff:ffff:ffff', '2001:db8:1:2::/64'],
    ['2001:DB8:0001:0002:0000:0000:0000:0001', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['::', '0:0:0:0::/64'],
    ['fe80::1%eth0', 'fe80:0:0:0::/64'],
    ['64:ff9b::192.0.2.33', '64:ff9b:0:0::/64'],
    ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64']
  ])('IPv6 %s vira o prefixo /64 (%s)', (ip, expected) => {
    expect(ipKey(ip)).toBe(expected)
  })

  it('endereços do MESMO /64 compartilham a chave; /64 diferentes não', () => {
    const base = ipKey('2001:db8:abcd:12::1')
    expect(ipKey('2001:db8:abcd:12::2')).toBe(base)
    expect(ipKey('2001:db8:abcd:12:dead:beef:cafe:1')).toBe(base)
    expect(ipKey('2001:db8:abcd:13::1')).not.toBe(base)
    expect(ipKey('2001:db8:abce:12::1')).not.toBe(base)
  })

  it('texto que não é IP é devolvido como está (sem lançar erro)', () => {
    expect(ipKey('unknown')).toBe('unknown')
    expect(ipKey('')).toBe('')
    expect(ipKey('999.1.1.1')).toBe('999.1.1.1')
  })
})

describe('getTrustProxy e o IP do cliente atrás do Caddy', () => {
  it('em produção confia em UM proxy; nos outros ambientes, em nenhum', () => {
    expect(getTrustProxy('production')).toBe(1)
    expect(getTrustProxy('development')).toBe(false)
    expect(getTrustProxy('test')).toBe(false)
  })

  async function ipSeenBy(trustProxy: number | boolean, headers: Record<string, string>) {
    const app = Fastify({ trustProxy })
    app.get('/ip', async (request) => ({ ip: request.ip }))
    const response = await app.inject({ method: 'GET', url: '/ip', remoteAddress: '172.18.0.2', headers })
    await app.close()
    return response.json<{ ip: string }>().ip
  }

  const production = getTrustProxy('production')

  it('em produção, a entrada que o Caddy acrescentou vale, e a que o cliente forjou é ignorada', async () => {
    // cliente escreveu "127.0.0.1" antes; o Caddy acrescentou o IP real do cliente no fim
    expect(await ipSeenBy(production, { 'x-forwarded-for': '127.0.0.1, 198.51.100.7' })).toBe('198.51.100.7')
    expect(await ipSeenBy(production, { 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 198.51.100.7' })).toBe('198.51.100.7')
  })

  it('em produção, com uma entrada só (Caddy substituiu o cabeçalho) usa essa entrada', async () => {
    expect(await ipSeenBy(production, { 'x-forwarded-for': '198.51.100.7' })).toBe('198.51.100.7')
  })

  it('sem o cabeçalho, usa o endereço da conexão', async () => {
    expect(await ipSeenBy(production, {})).toBe('172.18.0.2')
  })

  it('fora de produção o cabeçalho é ignorado (a API fica exposta direto)', async () => {
    expect(await ipSeenBy(getTrustProxy('development'), { 'x-forwarded-for': '127.0.0.1' })).toBe('172.18.0.2')
  })

  it('por que não `true`: o primeiro valor, escrito pelo cliente, passaria a valer', async () => {
    expect(await ipSeenBy(true, { 'x-forwarded-for': '127.0.0.1, 198.51.100.7' })).toBe('127.0.0.1')
  })
})

describe('TooManyRequestsError', () => {
  it('é 429 com o código do design e traz o retryAfter no corpo', () => {
    const error = new TooManyRequestsError('Muitas requisições. Tente novamente em 15 minutos.', 900)
    expect(error).toBeInstanceOf(AppError)
    expect(error.statusCode).toBe(429)
    expect(error.toBody()).toEqual({
      error: 'TooManyRequestsError',
      message: 'Muitas requisições. Tente novamente em 15 minutos.',
      retryAfter: 900
    })
  })
})