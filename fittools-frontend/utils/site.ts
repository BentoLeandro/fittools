// Dados fixos do site, usados no cabecalho, rodape, home e no nuxt.config.ts.

export interface CalculatorInfo {
  /** Caminho da pagina. Deve ser IDENTICO ao do site antigo (Requisitos 2.10 e 14.2). */
  path: string
  name: string
  description: string
  icon: string
}

export const SITE = {
  name: 'FitTools Brasil',
  tagline: 'Calculadoras fitness gratuitas, baseadas em ciência.',
  contactEmail: 'contato@fittoolsbrasil.com.br'
} as const

/** Perfis em redes sociais. Vazio ate definirmos as URLs reais; o rodape so mostra se houver itens. */
export const SOCIAL_LINKS: ReadonlyArray<{ label: string; url: string }> = []

/** Paginas legais (Requisito 11.4). As paginas em si ainda serao criadas. */
export const LEGAL_LINKS: ReadonlyArray<{ label: string; path: string }> = [
  { label: 'Política de Privacidade', path: '/privacidade' },
  { label: 'Termos de Uso', path: '/termos' }
]

/** Aviso exigido em todas as paginas de calculadora (Requisito 11.3). */
export const CALCULATOR_DISCLAIMER =
  'Estas calculadoras fornecem estimativas baseadas em médias populacionais. Consulte profissionais qualificados de saúde para orientação médica personalizada.'

export const CALCULATORS: ReadonlyArray<CalculatorInfo> = [
  {
    path: '/calculadora-de-imc',
    name: 'IMC',
    description: 'Índice de Massa Corporal e faixa de peso saudável (OMS).',
    icon: '⚖️'
  },
  {
    path: '/calculadora-de-calorias',
    name: 'Calorias e TMB',
    description: 'Gasto calórico diário e metas para perder ou ganhar peso.',
    icon: '🔥'
  },
  {
    path: '/calculadora-de-proteina',
    name: 'Proteína',
    description: 'Meta diária de proteína conforme o seu objetivo.',
    icon: '🥩'
  },
  {
    path: '/calculadora-de-gordura-corporal',
    name: 'Gordura corporal',
    description: 'Percentual de gordura pelo método da Marinha dos EUA.',
    icon: '📏'
  },
  {
    path: '/calculadora-de-1rm',
    name: '1RM',
    description: 'Carga máxima estimada e tabela de percentuais.',
    icon: '🏋️'
  },
  {
    path: '/calculadora-de-frequencia-cardiaca',
    name: 'Frequência cardíaca',
    description: 'FC máxima e zonas de treino (Karvonen).',
    icon: '❤️'
  },
  {
    path: '/calculadora-de-agua',
    name: 'Hidratação',
    description: 'Litros de água por dia conforme peso e treino.',
    icon: '💧'
  },
  {
    path: '/calculadora-de-pace',
    name: 'Pace de corrida',
    description: 'Ritmo de corrida e projeção de provas (Riegel).',
    icon: '🏃'
  }
]