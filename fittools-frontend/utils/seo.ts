// Dados estruturados (JSON-LD) das páginas de calculadora (Task 7.5, Requisito 2.3).
// Funções puras: sem Vue/Nuxt, testáveis em Node. O formato é o mesmo do site antigo.

export interface FaqItem {
  question: string
  answer: string
}

/** Schema.org WebApplication: descreve a calculadora como aplicativo web gratuito. */
export function buildWebApplicationLd(options: { name: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    inLanguage: 'pt-BR',
    url: options.url,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' }
  }
}

/** Schema.org FAQPage. As perguntas devem ser as MESMAS exibidas na página (regra do Google). */
export function buildFaqLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  }
}

/**
 * Serializa JSON-LD para dentro de uma tag <script>. Troca "<" por \u003c: continua sendo JSON
 * válido, mas um texto contendo "</script>" não consegue fechar a tag e injetar HTML.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}