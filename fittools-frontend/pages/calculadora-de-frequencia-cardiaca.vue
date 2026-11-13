<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import {
  HEART_RATE_ZONE_GUIDE,
  buildHeartRateResult,
  type HeartRateResult
} from '~/utils/heartrate-result'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// As três primeiras perguntas vêm do JSON-LD do site antigo (que não as mostrava na tela; agora
// aparecem, porque o Google exige que o markup corresponda ao conteúdo visível). As respostas
// sobre a fórmula 220 − idade e sobre a Zona 2 foram reescritas com mais cautela. A quarta
// pergunta é nova.
const faq: FaqItem[] = [
  {
    question: "Por que a fórmula '220 - idade' está ultrapassada?",
    answer:
      'A fórmula clássica (220 - idade) tende a superestimar a FC máxima em jovens e a subestimar em pessoas mais velhas. A equação de Tanaka (208 - 0,7 × idade), baseada em uma análise de mais de 18.000 pessoas, costuma ser mais precisa para adultos. Ainda assim, ambas são estimativas e cada pessoa pode ter uma FC máxima real diferente.'
  },
  {
    question: 'O que é a Zona 2 e por que ela é tão importante?',
    answer:
      'A Zona 2 (60% a 70% da FC de Reserva) é um ritmo confortável, em que ainda dá para conversar. Costuma ser usada para construir a base aeróbica e melhorar a capacidade de usar gordura como combustível, com pouco desgaste, o que a torna a faixa mais usada em treinos longos e de volume.'
  },
  {
    question: 'Como medir a frequência cardíaca de repouso?',
    answer:
      'Meça seus batimentos durante 60 segundos deitado, imediatamente após acordar, antes de levantar da cama ou tomar café da manhã.'
  },
  {
    question: 'Posso usar as zonas se tomo medicamentos para o coração?',
    answer:
      'Alguns medicamentos, como os betabloqueadores, reduzem a frequência cardíaca e deixam as zonas calculadas fora da realidade. Se você tem alguma condição cardíaca ou usa esse tipo de medicamento, converse com o seu médico antes de seguir faixas de frequência cardíaca.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-frequencia-cardiaca',
  title: 'Calculadora de Frequência Cardíaca e Zonas de Treino | FitTools',
  description:
    'Calcule sua FC máxima pela fórmula de Tanaka e descubra suas zonas de treinamento cardiovascular (Z1 a Z5) pelo método de frequência cardíaca de reserva de Karvonen.',
  ogTitle: 'Calculadora de Frequência Cardíaca e Zonas de Treino — FitTools',
  ogDescription: 'Prescreva seu cardio no ritmo exato: Zonas 1 a 5 calculadas com a equação de reserva de Karvonen.',
  appName: 'Calculadora de Zonas Cardíacas FitTools',
  faq
})

const fields: FieldConfig[] = [
  { type: 'number', name: 'age', label: 'Idade', unit: 'anos', placeholder: '30', min: 14, max: 100, integer: true },
  {
    type: 'number',
    name: 'rest',
    label: 'FC de repouso',
    unit: 'bpm',
    placeholder: '60',
    min: 30,
    max: 110,
    integer: true,
    help: 'Meça ao acordar por 60 segundos.'
  }
]

const values = ref<FormValues>({})
const result = ref<HeartRateResult | null>(null)

function calculate(parsed: ParsedValues) {
  result.value = buildHeartRateResult(parsed.age as number, parsed.rest as number)
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de frequência cardíaca"
      title="Zonas de Frequência Cardíaca"
      intro="Calcule sua FC Máxima e suas zonas de treino cardiovascular (Z1 a Z5) combinando a equação de Tanaka e o método da FC de Reserva de Karvonen."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule suas zonas de frequência cardíaca</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        submit-label="Calcular minhas zonas"
        aria-labelledby="calc-title"
        @submit="calculate"
      />
      <CalculatorResult v-if="result" :headline="result.headline" :cards="result.cards" :note="result.note">
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Treine no ritmo exato</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              Combine as suas zonas com o seu pace de corrida e projete tempos de prova.
            </p>
            <NuxtLink to="/calculadora-de-pace" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular meu pace
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>O método de Karvonen (FC de reserva)</h2>
      <p>
        Calcular zonas apenas aplicando porcentagens diretas sobre a FC máxima ignora a aptidão
        cardiovascular individual. O método da Frequência Cardíaca de Reserva (FCR) utiliza a sua FC de
        repouso como ponto de partida, ajustando os intervalos conforme seu condicionamento:
      </p>
      <div class="formula">FC Máxima (Tanaka) = 208 − (0,7 × Idade)</div>
      <div class="formula">FC Reserva = FC Máxima − FC Repouso</div>
      <div class="formula">Alvo = (FC Reserva × % Intensidade) + FC Repouso</div>

      <h2>Detalhamento das 5 zonas de treinamento</h2>
      <ul>
        <li v-for="zone in HEART_RATE_ZONE_GUIDE" :key="zone.title">
          <b>{{ zone.title }} ({{ zone.from }}% a {{ zone.to }}% da FC de reserva):</b> {{ zone.description }}
        </li>
      </ul>

      <h2>Limitações da estimativa</h2>
      <p>
        A FC máxima calculada é uma média da população: a sua real pode ser diferente em vários
        batimentos por minuto. As zonas valem para adultos saudáveis; menores de 18 anos, pessoas com
        doenças cardíacas e quem usa medicamentos que alteram a frequência cardíaca devem seguir a
        orientação do médico. Se o resultado ficar com as zonas muito comprimidas (como acontece com FC
        de repouso muito alta e idade avançada), a estimativa perde utilidade. Para planejar treinos de
        corrida, use também a
        <NuxtLink to="/calculadora-de-pace"><b>Calculadora de Pace</b></NuxtLink>.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['tanaka', 'karvonen']" />
    </div>
  </div>
</template>