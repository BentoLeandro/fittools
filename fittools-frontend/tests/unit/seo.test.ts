import { describe, it, expect } from 'vitest'
import { buildFaqLd, buildWebApplicationLd, serializeJsonLd } from '../../utils/seo'

describe('buildWebApplicationLd', () => {
  it('mantém o formato do JSON-LD do site antigo', () => {
    expect(buildWebApplicationLd({ name: 'Calculadora de IMC FitTools', url: 'https://fittoolsbrasil.com.br/calculadora-de-imc' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Calculadora de IMC FitTools',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      url: 'https://fittoolsbrasil.com.br/calculadora-de-imc',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' }
    })
  })
})

describe('buildFaqLd', () => {
  it('uma Question por pergunta, com a resposta como texto', () => {
    const ld = buildFaqLd([
      { question: 'P1?', answer: 'R1' },
      { question: 'P2?', answer: 'R2' }
    ])
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toEqual([
      { '@type': 'Question', name: 'P1?', acceptedAnswer: { '@type': 'Answer', text: 'R1' } },
      { '@type': 'Question', name: 'P2?', acceptedAnswer: { '@type': 'Answer', text: 'R2' } }
    ])
  })

  it('lista vazia gera mainEntity vazio', () => {
    expect(buildFaqLd([]).mainEntity).toEqual([])
  })
})

describe('serializeJsonLd', () => {
  it('é JSON válido que volta ao objeto original', () => {
    const data = buildFaqLd([{ question: 'Pergunta com "aspas" e acentuação?', answer: 'Resposta' }])
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })

  it('não deixa um "</script>" no texto fechar a tag nem injetar HTML', () => {
    const evil = buildFaqLd([{ question: '</script><script>alert(1)</script>', answer: '<img src=x onerror=alert(1)>' }])
    const out = serializeJsonLd(evil)
    expect(out).not.toContain('<')
    expect(out.toLowerCase()).not.toContain('</script')
    expect(JSON.parse(out)).toEqual(evil)
  })
})