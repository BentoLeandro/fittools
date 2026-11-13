<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import type { Sex } from '~/types/calculators'
import {
  BODY_FAT_BANDS,
  buildBodyFatResult,
  formatBand,
  type BodyFatSuccess
} from '~/utils/bodyfat-result'
import { applyDefaults } from '~/utils/field-validation'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// As três primeiras perguntas vêm do JSON-LD do site antigo (que não as mostrava na tela; agora
// aparecem, porque o Google exige que o markup corresponda ao conteúdo visível). A resposta sobre
// a confiabilidade foi reescrita sem os números do site antigo (correlação e erro padrão), que
// não se confirmaram em estudos independentes. A quarta pergunta é nova.
const faq: FaqItem[] = [
  {
    question: 'Como funciona o método da Marinha dos EUA para gordura corporal?',
    answer:
      'O método utiliza equações logarítmicas baseadas nas circunferências do pescoço, abdômen e altura (mais quadril para mulheres) para estimar a densidade corporal e calcular a porcentagem de tecido adiposo.'
  },
  {
    question: 'O método da fita métrica é confiável?',
    answer:
      'É uma estimativa útil para acompanhar a sua evolução, mas não substitui exames de composição corporal como o DEXA. O erro em relação a esses métodos pode passar de alguns pontos percentuais e varia de pessoa para pessoa. Medir sempre do mesmo jeito, no mesmo horário e com a mesma fita dá comparações mais confiáveis do que o valor isolado.'
  },
  {
    question: 'Qual o percentual de gordura ideal para homens e mulheres?',
    answer:
      'Para homens, a faixa atlética e saudável fica entre 10% e 18%. Para mulheres, devido a fatores hormonais e reprodutivos essenciais, a faixa saudável situa-se entre 18% e 25%.'
  },
  {
    question: 'Por que o resultado é diferente do da bioimpedância?',
    answer:
      'Cada método mede coisas diferentes: a fita usa circunferências e uma equação, enquanto a bioimpedância depende do nível de hidratação, do horário e do aparelho. É normal haver diferença entre eles, por isso compare sempre resultados do mesmo método.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-gordura-corporal',
  title: 'Calculadora de Percentual de Gordura — Método Marinha dos EUA | FitTools',
  description:
    'Estime seu percentual de gordura corporal (%BF) e sua quantidade de massa magra utilizando apenas fita métrica e a fórmula oficial da Marinha Norte-Americana (US Navy).',
  ogTitle: 'Calculadora de Gordura Corporal (US Navy) — FitTools',
  ogDescription: 'Estime sua composição corporal com alta precisão sem precisar de bioimpedância ou adipômetro.',
  appName: 'Calculadora de Gordura US Navy FitTools',
  faq
})

// O quadril só vale para mulheres. A cintura tem a mesma chave nos dois sexos, mas a orientação
// de medida é diferente; só um dos dois campos fica visível por vez (showIf).
const fields: FieldConfig[] = [
  {
    type: 'radio',
    name: 'sex',
    label: 'Sexo biológico',
    default: 'male',
    options: [
      { value: 'male', label: 'Masculino' },
      { value: 'female', label: 'Feminino' }
    ]
  },
  { type: 'number', name: 'cm', label: 'Altura', unit: 'cm', placeholder: '175', min: 120, max: 230 },
  {
    type: 'number',
    name: 'neck',
    label: 'Pescoço',
    unit: 'cm',
    placeholder: '38',
    min: 20,
    max: 70,
    help: 'Logo abaixo do pomo de adão, com a fita levemente inclinada para baixo na frente.'
  },
  {
    type: 'number',
    name: 'waist',
    label: 'Cintura',
    unit: 'cm',
    placeholder: '84',
    min: 40,
    max: 200,
    help: 'Na linha horizontal do umbigo, no final de uma expiração normal.',
    showIf: v => v.sex !== 'female'
  },
  {
    type: 'number',
    name: 'waist',
    label: 'Cintura',
    unit: 'cm',
    placeholder: '74',
    min: 40,
    max: 200,
    help: 'No ponto mais estreito do abdômen, geralmente 2 a 3 cm acima do umbigo.',
    showIf: v => v.sex === 'female'
  },
  {
    type: 'number',
    name: 'hip',
    label: 'Quadril',
    unit: 'cm',
    placeholder: '96',
    min: 50,
    max: 200,
    help: 'Na maior protuberância dos glúteos, com os pés juntos.',
    showIf: v => v.sex === 'female'
  },
  {
    type: 'number',
    name: 'kg',
    label: 'Peso',
    unit: 'kg',
    placeholder: '75',
    min: 30,
    max: 300,
    required: false,
    help: 'Opcional: com o peso, mostramos também a massa gorda e a massa magra.'
  }
]

// Os valores iniciais já entram preenchidos: o HTML estático sai com "Masculino" marcado.
const values = ref<FormValues>(applyDefaults(fields, {}))
const result = ref<BodyFatSuccess | null>(null)
const formError = ref<string | undefined>()

function calculate(parsed: ParsedValues) {
  const outcome = buildBodyFatResult({
    sex: parsed.sex as Sex,
    height_cm: parsed.cm as number,
    neck_cm: parsed.neck as number,
    waist_cm: parsed.waist as number,
    hip_cm: parsed.hip as number | undefined,
    weight_kg: parsed.kg as number | undefined
  })
  if (outcome.ok) {
    formError.value = undefined
    result.value = outcome
  } else {
    result.value = null
    formError.value = outcome.error
  }
}

const referenceTable = {
  caption: 'Faixas de referência de percentual de gordura corporal por sexo',
  head: ['Categoria', 'Homens', 'Mulheres'],
  rows: BODY_FAT_BANDS.map(band => [band.category, formatBand(band.male), formatBand(band.female)])
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de gordura corporal"
      title="Calculadora de Gordura Corporal"
      intro="Estime seu percentual de tecido adiposo (%BF), massa gorda e massa livre de gordura por meio do protocolo antropométrico da Marinha dos Estados Unidos (Hodgdon & Beckett)."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule seu percentual de gordura</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        :error="formError"
        submit-label="Calcular meu percentual de gordura"
        aria-labelledby="calc-title"
        @submit="calculate"
      />
      <CalculatorResult v-if="result" :headline="result.headline" :cards="result.cards" :note="result.note">
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Quantas calorias comer por dia?</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              Para reduzir gordura mantendo músculos, comece pelo seu gasto calórico diário.
            </p>
            <NuxtLink to="/calculadora-de-calorias" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular minhas calorias
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>Instruções para medição precisa com a fita métrica</h2>
      <p>
        Para obter um resultado consistente, utilize uma fita métrica maleável e meça pela manhã, em
        jejum, mantendo a fita firme sobre a pele sem comprimir o tecido subcutâneo:
      </p>
      <ul>
        <li><b>Altura:</b> descalço, com postura ereta e calcanhares encostados na parede.</li>
        <li>
          <b>Pescoço:</b> logo abaixo do pomo de adão (laringe), com a fita levemente inclinada para baixo
          na parte frontal.
        </li>
        <li>
          <b>Cintura (homens):</b> na linha horizontal do umbigo, no final de uma expiração normal (sem
          recolher o abdômen).
        </li>
        <li>
          <b>Cintura (mulheres):</b> no ponto de menor circunferência abdominal, geralmente cerca de 2 a 3
          cm acima do umbigo.
        </li>
        <li><b>Quadril (mulheres):</b> na maior protuberância dos glúteos com os pés juntos.</li>
      </ul>

      <h2>Fórmulas matemáticas do protocolo US Navy</h2>
      <div class="formula">
        Homens: %Gordura = 495 ÷ [1,0324 − 0,19077 × log10(Cintura − Pescoço) + 0,15456 × log10(Altura)] − 450
      </div>
      <div class="formula">
        Mulheres: %Gordura = 495 ÷ [1,29579 − 0,35004 × log10(Cintura + Quadril − Pescoço) + 0,22100 × log10(Altura)] − 450
      </div>
      <p>Todas as medidas em centímetros.</p>

      <h2>Tabela de referência de gordura corporal</h2>
      <p>Diferente do IMC, o percentual de gordura reflete diretamente a qualidade da composição física:</p>
      <CalculatorDataTable class="mt-3" v-bind="referenceTable" />

      <h2>Limitações do método</h2>
      <p>
        A fita métrica fornece uma estimativa, e não um diagnóstico. O resultado pode ser menos preciso
        para pessoas com muita massa muscular, para quem acumula gordura de forma incomum e para
        gestantes. A calculadora é indicada para adultos. Use o número principalmente para acompanhar a
        sua evolução, repetindo a medição sempre do mesmo jeito. Para entender se o seu peso está
        adequado, combine com o
        <NuxtLink to="/calculadora-de-imc"><b>cálculo do IMC</b></NuxtLink>.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['navy']" />
    </div>
  </div>
</template>