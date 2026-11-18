/**
 * Quantos proxies confiáveis existem na frente da API.
 *
 * Em produção o único é o Caddy (cliente -> Caddy -> API). Com `1`, o IP do cliente é o que o
 * PRÓPRIO Caddy viu (a última entrada do X-Forwarded-For), e entradas falsas que o cliente
 * escreveu antes dela são ignoradas. Com `true`, a primeira entrada (a do cliente) valeria, e
 * quem mandasse `X-Forwarded-For: 127.0.0.1` poderia escapar de todo limite de requisições.
 *
 * Em desenvolvimento a API fica exposta direto: nenhum proxy é confiável.
 */
export function getTrustProxy(nodeEnv: string): number | false {
  return nodeEnv === 'production' ? 1 : false
}