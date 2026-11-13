import { buildFaqLd, buildWebApplicationLd, serializeJsonLd, type FaqItem } from '~/utils/seo'

export interface CalculatorSeoOptions {
  /** Caminho da página, idêntico ao do site antigo (ex.: "/calculadora-de-imc"). */
  path: string
  title: string
  description: string
  /** Padrão: o mesmo `title` / `description`. */
  ogTitle?: string
  ogDescription?: string
  /** Nome do aplicativo no JSON-LD (ex.: "Calculadora de IMC FitTools"). */
  appName: string
  /** Perguntas frequentes: viram o JSON-LD FAQPage e devem ser as mesmas exibidas na página. */
  faq: FaqItem[]
}

/**
 * Meta tags da página de uma calculadora: título, descrição, Open Graph, URL canônica e os
 * dados estruturados WebApplication + FAQPage (Requisitos 2.2, 2.3 e 2.4).
 * O domínio vem de `site.url` (nuxt.config), então o canonical sempre bate com a produção.
 */
export function useCalculatorSeo(options: CalculatorSeoOptions) {
  const site = useSiteConfig()
  const url = `${site.url}${options.path}`

  useSeoMeta({
    title: options.title,
    description: options.description,
    ogTitle: options.ogTitle ?? options.title,
    ogDescription: options.ogDescription ?? options.description,
    ogType: 'website',
    ogSiteName: site.name,
    ogLocale: 'pt_BR',
    ogUrl: url
  })

  useHead({
    link: [{ rel: 'canonical', href: url }],
    script: [
      { type: 'application/ld+json', innerHTML: serializeJsonLd(buildWebApplicationLd({ name: options.appName, url })) },
      { type: 'application/ld+json', innerHTML: serializeJsonLd(buildFaqLd(options.faq)) }
    ]
  })
}