<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import { buildPaceConversionTable, buildPaceResult, type PaceSuccess } from '~/utils/pace-result'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// As três primeiras perguntas vêm do JSON-LD do site antigo (que não as mostrava na tela; agora
// aparecem, porque o Google exige que o markup corresponda ao conteúdo visível). A quarta é nova.
const faq: FaqItem[] = [
  {
    question: "O que significa o termo 'pace' na corrida?",
    answer:
      'Pace é a métrica padrão do atletismo que indica o tempo necessário para percorrer exatamente um quilômetro (expresso em minutos e segundos por km, ex.: 5:30 min/km).'
  },
  {
    question: 'Como a fórmula de Riegel prevê o tempo de outras provas?',
    answer:
      'A fórmula matemática de Peter Riegel aplica um expoente de fadiga fisiológica (1,06) que projeta a perda progressiva de velocidade à medida que a distância da prova dobra.'
  },
  {
    question: 'Como converter pace (min/km) para velocidade em km/h?',
    answer: 'Divida 60 pelo valor decimal do pace. Por exemplo: um pace de 5:00 min/km equivale a 60 ÷ 5 = 12 km/h.'
  },
  {
    question: 'A projeção de Riegel vale para qualquer distância?',
    answer:
      'Ela funciona melhor para provas de 5 km até a maratona, a partir de um resultado recente feito em esforço máximo. Projetar uma maratona a partir de um tempo de 5 km costuma ser otimista, porque a maratona exige treino específico de resistência. Tempos muito curtos, de poucos minutos, também não são boa base.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-pace',
  title: 'Calculadora de Pace de Corrida e Previsão de Provas (Riegel) | FitTools',
  description:
    'Calcule seu ritmo médio de corrida (min/km), velocidade em km/h e projete seus tempos para 5k, 10k, meia maratona e maratona pela fórmula de Peter Riegel.',
  ogTitle: 'Calculadora de Pace de Corrida — FitTools',
  ogDescription: 'Converta tempo e distância no seu pace exato e descubra suas projeções para provas de 5 km até 42 km.',
  appName: 'Calculadora de Pace FitTools',
  faq
})

const fields: FieldConfig[] = [
  { type: 'number', name: 'km', label: 'Distância', unit: 'km', placeholder: '10', min: 0.4, max: 300 },
  { type: 'number', name: 'h', label: 'Horas', unit: 'h', placeholder: '0', min: 0, max: 24, integer: true, required: false },
  { type: 'number', name: 'm', label: 'Minutos', unit: 'min', placeholder: '50', min: 0, max: 59, integer: true, required: false },
  { type: 'number', name: 's', label: 'Segundos', unit: 's', placeholder: '0', min: 0, max: 59, integer: true, required: false }
]

const values = ref<FormValues>({})
const result = ref<PaceSuccess | null>(null)
const formError = ref<string | undefined>()

function calculate(parsed: ParsedValues) {
  const outcome = buildPaceResult({
    distance_km: parsed.km as number,
    hours: parsed.h as number | undefined,
    minutes: parsed.m as number | undefined,
    seconds: parsed.s as number | undefined
  })
  if (outcome.ok) {
    formError.value = undefined
    result.value = outcome
  } else {
    result.value = null
    formError.value = outcome.error
  }
}

const conversionTable = buildPaceConversionTable()
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de pace"
      title="Calculadora de Pace de Corrida"
      intro="Calcule seu ritmo por quilômetro, velocidade média e faça projeções de tempo para provas de 5 km, 10 km, Meia Maratona e Maratona."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule o seu pace</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        :error="formError"
        submit-label="Calcular meu pace"
        aria-labelledby="calc-title"
        @submit="calculate"
      >
        <template #after>
          <p class="mt-3 text-[0.78rem] text-muted">
            Informe o tempo total da corrida em horas, minutos e segundos. Os campos que não se aplicam
            podem ficar vazios.
          </p>
        </template>
      </CalculatorForm>
      <CalculatorResult v-if="result" :headline="result.headline" :table="result.table" :note="result.note">
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Treine no ritmo certo</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              Descubra suas zonas de frequência cardíaca e controle a intensidade dos seus treinos.
            </p>
            <NuxtLink to="/calculadora-de-frequencia-cardiaca" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular minhas zonas
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>O conceito de pace e estratégia de ritmo</h2>
      <p>
        No atletismo de rua e pista, a velocidade absoluta (km/h) é pouco intuitiva para o gerenciamento
        de prova. O <b>pace</b> (minutos por quilômetro) permite ao corredor checar os tempos parciais a
        cada placa de quilometragem, garantindo que o plano de prova não seja arruinado por uma largada em
        ritmo excessivo.
      </p>

      <h2>A equação de projeção de Peter Riegel</h2>
      <p>
        Publicada no periódico <i>American Scientist</i>, a equação de Riegel é um dos métodos mais
        usados para prever desempenhos em distâncias variadas a partir de um resultado recente conhecido:
      </p>
      <div class="formula">Tempo projetado (T2) = Tempo base (T1) × (Distância 2 ÷ Distância 1)^1,06</div>
      <p>
        Para converter pace em velocidade, divida 60 pelo pace em minutos decimais:
        velocidade (km/h) = 60 ÷ pace.
      </p>

      <h2>Tabela de conversão rápida</h2>
      <CalculatorDataTable class="mt-3" v-bind="conversionTable" />

      <h2>Limitações da projeção</h2>
      <p>
        A projeção de Riegel assume que você está treinado para a distância projetada e que as condições
        são parecidas: relevo, clima e tipo de piso mudam o tempo real. Use um resultado recente, feito em
        esforço máximo, e lembre que uma maratona exige treino específico de resistência. Para controlar a
        intensidade dos seus treinos, veja também as
        <NuxtLink to="/calculadora-de-frequencia-cardiaca"><b>zonas de frequência cardíaca</b></NuxtLink>.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['riegel']" />
    </div>
  </div>
</template>