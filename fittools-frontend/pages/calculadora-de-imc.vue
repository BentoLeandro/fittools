<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import { buildBmiResult, type BmiResult } from '~/utils/bmi-result'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// Mesmas perguntas no JSON-LD e na tela (o Google exige que o markup corresponda ao conteúdo
// visível). As três primeiras vêm do JSON-LD do site antigo, as duas últimas dos <details>.
const faq: FaqItem[] = [
  {
    question: 'O que é o Índice de Massa Corporal (IMC)?',
    answer:
      'O IMC é uma medida internacional adotada pela OMS que relaciona o peso e a altura do indivíduo para classificar o estado nutricional em faixas como desnutrição, peso normal, sobrepeso e obesidade.'
  },
  {
    question: 'Por que o IMC pode falhar para quem treina musculação?',
    answer:
      "A fórmula do IMC não distingue massa muscular de gordura corporal. Atletas e praticantes de musculação com elevado volume de massa magra podem ser classificados erroneamente como tendo 'sobrepeso' ou 'obesidade'."
  },
  {
    question: 'Qual a faixa de IMC considerada ideal?',
    answer:
      'Para adultos entre 20 e 60 anos, a faixa de normalidade estabelecida pela OMS fica entre 18,5 e 24,9 kg/m².'
  },
  {
    question: 'O IMC é aplicável para idosos?',
    answer:
      'Para pessoas com mais de 60 anos, diversas diretrizes de geriatria adotam faixas ajustadas (geralmente entre 22 e 27 kg/m² como normalidade), visto que uma reserva ligeiramente maior de massa corporal está associada a menor mortalidade na terceira idade.'
  },
  {
    question: 'O que fazer se meu IMC estiver na faixa de sobrepeso?',
    answer:
      'O primeiro passo é avaliar a circunferência da cintura e o percentual de gordura. Se houver excesso real de tecido adiposo visceral, recomenda-se iniciar um déficit calórico moderado aliado a treinamento de resistência.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-imc',
  title: 'Calculadora de IMC Online Grátis — Tabela OMS e Peso Ideal | FitTools',
  description:
    'Calcule seu Índice de Massa Corporal (IMC), descubra sua faixa de peso saudável segundo a OMS e entenda as limitações do índice para praticantes de musculação.',
  ogTitle: 'Calculadora de IMC e Peso Ideal — FitTools',
  ogDescription:
    'Calcule seu IMC em segundos e descubra sua faixa de peso ideal conforme a Organização Mundial da Saúde.',
  appName: 'Calculadora de IMC FitTools',
  faq
})

// Faixas plausíveis para adultos (Task 7.5): 30–300 kg e 120–230 cm.
const fields: FieldConfig[] = [
  { type: 'number', name: 'kg', label: 'Peso', unit: 'kg', placeholder: '75', min: 30, max: 300 },
  { type: 'number', name: 'cm', label: 'Altura', unit: 'cm', placeholder: '175', min: 120, max: 230 }
]

const values = ref<FormValues>({})
const result = ref<BmiResult | null>(null)

function calculate(parsed: ParsedValues) {
  result.value = buildBmiResult(parsed.kg as number, parsed.cm as number)
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de IMC"
      title="Calculadora de IMC e Peso Ideal"
      intro="Calcule seu Índice de Massa Corporal segundo os parâmetros oficiais da Organização Mundial da Saúde e descubra sua faixa de peso de referência."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule seu IMC</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        submit-label="Calcular meu IMC"
        aria-labelledby="calc-title"
        @submit="calculate"
      />
      <CalculatorResult v-if="result" :headline="result.headline" :cards="result.cards" :note="result.note">
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Descubra sua composição real</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              Calcule seu percentual de gordura com a fórmula oficial da Marinha dos EUA.
            </p>
            <NuxtLink to="/calculadora-de-gordura-corporal" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular % de gordura
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>Como o Índice de Massa Corporal é calculado</h2>
      <p>
        O cálculo do IMC consiste na divisão do peso corporal (em quilogramas) pelo quadrado da altura
        (em metros). O resultado classifica o indivíduo dentro de faixas populacionais de risco à saúde.
      </p>
      <div class="formula">IMC = Peso (kg) ÷ [Altura (m) × Altura (m)]</div>

      <h2>Classificação oficial da OMS para adultos</h2>
      <ul>
        <li><b>Abaixo de 18,5:</b> Abaixo do peso (risco de carências nutricionais e imunidade baixa)</li>
        <li><b>18,5 a 24,9:</b> Peso normal / Eutrofia (menor risco estatístico para doenças crônicas)</li>
        <li><b>25,0 a 29,9:</b> Sobrepeso (sinal de alerta para acúmulo de tecido adiposo)</li>
        <li><b>30,0 a 34,9:</b> Obesidade Grau I</li>
        <li><b>35,0 a 39,9:</b> Obesidade Grau II (severa)</li>
        <li><b>40,0 ou mais:</b> Obesidade Grau III (mórbida)</li>
      </ul>

      <h2>O Paradoxo do IMC em Atletas e Praticantes de Musculação</h2>
      <p>
        Criado originalmente pelo estatístico Adolphe Quetelet no século XIX, o IMC foi desenhado para
        estudos populacionais, não para diagnósticos individuais refinados. O músculo esquelético é
        cerca de 18% mais denso que o tecido adiposo. Por essa razão, indivíduos atléticos
        frequentemente apresentam IMC superior a 25 ou 28 sem apresentar excesso de gordura.
      </p>
      <p>
        Para uma avaliação fidedigna da sua composição física, combine o IMC com a nossa
        <NuxtLink to="/calculadora-de-gordura-corporal"><b>Calculadora de Percentual de Gordura</b></NuxtLink>
        (método US Navy).
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['bmi']" />
    </div>
  </div>
</template>