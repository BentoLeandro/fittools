import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useToast } from '../../composables/useToast'

// No Nuxt, useState e auto-importado; no Vitest puro simulamos um estado por chave.
let states: Record<string, Ref<unknown>>

beforeEach(() => {
  states = {}
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    states[key] ??= ref(init())
    return states[key]
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useToast', () => {
  it('começa sem avisos', () => {
    expect(useToast().toasts.value).toEqual([])
  })

  it('success, error e info guardam o tipo e a mensagem', () => {
    const toast = useToast()
    toast.success('Perfil atualizado com sucesso!')
    toast.error('Não foi possível conectar.')
    toast.info('Dica de treino')

    expect(toast.toasts.value.map((t) => [t.type, t.message])).toEqual([
      ['success', 'Perfil atualizado com sucesso!'],
      ['error', 'Não foi possível conectar.'],
      ['info', 'Dica de treino']
    ])
  })

  it('cada aviso recebe um id próprio', () => {
    const toast = useToast()
    const a = toast.success('a')
    const b = toast.success('b')
    expect(a).not.toBe(b)
  })

  it('sucesso some sozinho depois de 5 segundos', () => {
    const toast = useToast()
    toast.success('ok')

    vi.advanceTimersByTime(4999)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('erro fica mais tempo: 8 segundos', () => {
    const toast = useToast()
    toast.error('falhou')

    vi.advanceTimersByTime(5000)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('aceita duração própria e duração 0 deixa o aviso fixo', () => {
    const toast = useToast()
    toast.info('rápido', 1000)
    toast.info('fixo', 0)

    vi.advanceTimersByTime(1000)
    expect(toast.toasts.value.map((t) => t.message)).toEqual(['fixo'])
    vi.advanceTimersByTime(60_000)
    expect(toast.toasts.value.map((t) => t.message)).toEqual(['fixo'])
  })

  it('dismiss fecha só o aviso escolhido', () => {
    const toast = useToast()
    const first = toast.info('um')
    toast.info('dois')

    toast.dismiss(first)
    expect(toast.toasts.value.map((t) => t.message)).toEqual(['dois'])
  })

  it('o timer de um aviso não fecha os outros', () => {
    const toast = useToast()
    toast.info('curto', 1000)
    vi.advanceTimersByTime(500)
    toast.info('longo', 5000)

    vi.advanceTimersByTime(500) // o curto vence aqui
    expect(toast.toasts.value.map((t) => t.message)).toEqual(['longo'])
  })

  it('mantém no máximo 4 avisos, descartando os mais antigos', () => {
    const toast = useToast()
    for (const n of [1, 2, 3, 4, 5, 6]) toast.info(`aviso ${n}`, 0)

    expect(toast.toasts.value.map((t) => t.message)).toEqual([
      'aviso 3',
      'aviso 4',
      'aviso 5',
      'aviso 6'
    ])
  })

  it('o estado é compartilhado entre chamadas de useToast', () => {
    useToast().success('visível em outro lugar')
    expect(useToast().toasts.value).toHaveLength(1)
  })
})
describe('useToast: pausa ao passar o mouse ou focar (WCAG 2.2.1)', () => {
  it('pausar para o contador e retomar continua do tempo que faltava', () => {
    const toast = useToast()
    const id = toast.info('lendo', 5000)

    vi.advanceTimersByTime(3000) // faltam 2000
    toast.pause(id)
    vi.advanceTimersByTime(60_000) // parado: nada acontece
    expect(toast.toasts.value).toHaveLength(1)

    toast.resume(id)
    vi.advanceTimersByTime(1999)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('pausar duas vezes não perde nem soma tempo', () => {
    const toast = useToast()
    const id = toast.info('x', 5000)

    vi.advanceTimersByTime(1000) // faltam 4000
    toast.pause(id, 'hover')
    vi.advanceTimersByTime(10_000)
    toast.pause(id, 'hover') // repetido: sem efeito
    vi.advanceTimersByTime(10_000)
    toast.resume(id, 'hover')

    vi.advanceTimersByTime(3999)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('mouse e foco são motivos independentes: só retoma quando os dois saem', () => {
    const toast = useToast()
    const id = toast.info('x', 2000)

    toast.pause(id, 'hover')
    toast.pause(id, 'focus')
    toast.resume(id, 'hover') // o foco ainda segura
    vi.advanceTimersByTime(60_000)
    expect(toast.toasts.value).toHaveLength(1)

    toast.resume(id, 'focus')
    vi.advanceTimersByTime(2000)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('resume sem pause anterior não cria um segundo contador', () => {
    const toast = useToast()
    const id = toast.info('x', 2000)

    toast.resume(id)
    toast.resume(id)
    vi.advanceTimersByTime(1999)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('pausar um aviso não afeta os outros', () => {
    const toast = useToast()
    const a = toast.info('a', 2000)
    toast.info('b', 2000)

    toast.pause(a)
    vi.advanceTimersByTime(2000)
    expect(toast.toasts.value.map((t) => t.message)).toEqual(['a'])
  })

  it('fechar um aviso pausado o remove e retomar depois não dá erro', () => {
    const toast = useToast()
    const id = toast.info('x', 2000)

    toast.pause(id)
    toast.dismiss(id)
    expect(toast.toasts.value).toHaveLength(0)
    expect(() => toast.resume(id)).not.toThrow()
    vi.advanceTimersByTime(10_000)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('aviso fixo (duração 0) ignora pausa e retomada', () => {
    const toast = useToast()
    const id = toast.info('fixo', 0)

    toast.pause(id)
    toast.resume(id)
    vi.advanceTimersByTime(60_000)
    expect(toast.toasts.value).toHaveLength(1)
  })

  it('aviso descartado pelo limite de 4 não deixa contador solto', () => {
    const toast = useToast()
    const first = toast.info('um', 5000)
    for (const n of [2, 3, 4, 5]) toast.info(`aviso ${n}`, 0)

    // o primeiro saiu pelo limite; pausar/retomar nele não pode reviver nada
    expect(toast.toasts.value.some((t) => t.id === first)).toBe(false)
    toast.pause(first)
    toast.resume(first)
    vi.advanceTimersByTime(10_000)
    expect(toast.toasts.value.map((t) => t.message)).toEqual([
      'aviso 2',
      'aviso 3',
      'aviso 4',
      'aviso 5'
    ])
  })
})