<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import type { ProteinGoal } from '~/types/calculators'
import { proteinRange } from '~/composables/useScience'
import { applyDefaults } from '~/utils/field-validation'
import { formatNumber } from '~/utils/format'
import {
  DEFAULT_PROTEIN_GOAL,
  PROTEIN_FOODS,
  PROTEIN_GOALS,
  buildProteinResult,
  formatPerKg,
  type ProteinResult
} from '~/utils/protein-result'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// Perguntas e respostas: as três primeiras vêm do JSON-LD do site antigo e as duas últimas dos
// <details>. As respostas sobre absorção por refeição e sobre os rins foram reescritas com mais
// cautela. A mesma lista aparece na tela e no JSON-LD FAQPage.
const faq: FaqItem[] = [
  {
    question: 'Quantos gramas de proteína devo comer por quilo de peso?',
    answer:
      'Para hipertrofia, a literatura científica recomenda entre 1,6 e 2,2 g/kg/dia. Durante períodos de restrição calórica severa (cutting), as necessidades podem subir para 1,8 a 2,4 g/kg para evitar o catabolismo muscular.'
  },
  {
    question: 'Existe um limite máximo de proteína que o corpo absorve por refeição?',
    answer:
      'O intestino absorve praticamente toda a proteína ingerida, mas a síntese proteica muscular tem um teto por refeição. Em geral, a literatura aponta algo entre 0,25 e 0,4 g de proteína de alto valor biológico por quilo de peso por refeição, o que dá de 20 a 40 g para a maioria das pessoas.'
  },
  {
    question: 'O consumo elevado de proteína prejudica os rins?',
    answer:
      'Estudos em adultos saudáveis, com função renal preservada, não mostram prejuízo aos rins com ingestões acima da faixa recomendada. Já quem tem doença renal, diabetes ou outros fatores de risco deve conversar com um médico ou nutricionista antes de aumentar a proteína.'
  },
  {
    question: 'Preciso tomar suplementos como Whey Protein?',
    answer:
      'Não é obrigatório. Suplementos são alimentos em pó desenvolvidos para praticidade. Se você consegue atingir sua meta utilizando fontes alimentares convencionais (frango, ovos, peixes, laticínios, soja), o suplemento torna-se opcional.'
  },
  {
    question: 'Proteínas vegetais possuem a mesma eficácia?',
    answer:
      'Sim, desde que a ingestão total diária atinja a meta e haja variedade de fontes para garantir um perfil completo de aminoácidos essenciais (ex.: combinação de leguminosas e cereais).'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-proteina',
  title: 'Calculadora de Proteína Diária — Padrão ISSN e Helms | FitTools',
  description:
    'Descubra quantos gramas de proteína ingerir por dia conforme seu peso corporal e objetivo: hipertrofia, definição (cutting) ou saúde geral. Baseado no posicionamento da ISSN.',
  ogTitle: 'Calculadora de Proteína Diária — FitTools',
  ogDescription: 'Calcule sua ingestão proteica ideal com base nas diretrizes da International Society of Sports Nutrition.',
  appName: 'Calculadora de Proteína FitTools',
  faq
})

const fields: FieldConfig[] = [
  { type: 'number', name: 'kg', label: 'Peso corporal', unit: 'kg', placeholder: '75', min: 30, max: 300 },
  {
    type: 'select',
    name: 'goal',
    label: 'Objetivo principal',
    default: DEFAULT_PROTEIN_GOAL,
    options: PROTEIN_GOALS.map(goal => ({ value: goal.value, label: goal.label }))
  }
]

// Os valores iniciais já entram preenchidos: o HTML estático sai com o objetivo marcado.
const values = ref<FormValues>(applyDefaults(fields, {}))
const result = ref<ProteinResult | null>(null)

function calculate(parsed: ParsedValues) {
  result.value = buildProteinResult(parsed.kg as number, parsed.goal as ProteinGoal)
}

// A lista de recomendações no texto sai da mesma função do cálculo, para nunca divergir dele.
const goalRecommendations = PROTEIN_GOALS.map(goal => {
  const range = proteinRange(1, goal.value)
  return { title: goal.title, perKg: `${formatPerKg(range.perKgMin)} a ${formatPerKg(range.perKgMax)} g/kg` }
})

const foodsTable = {
  caption: 'Quantidade de proteína por 100 gramas de alimentos comuns',
  head: ['Alimento', 'Proteína por 100 g'],
  rows: PROTEIN_FOODS.map(food => [food.name, `${formatNumber(food.protein, 1, 1)} g`])
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de proteína"
      title="Calculadora de Proteína Diária"
      intro="Defina sua meta diária de ingestão proteica e a divisão ideal por refeição com base nos consensos da International Society of Sports Nutrition (ISSN)."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule sua meta de proteína</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        submit-label="Calcular minha proteína"
        aria-labelledby="calc-title"
        @submit="calculate"
      />
      <CalculatorResult v-if="result" :headline="result.headline" :cards="result.cards" :note="result.note">
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Quantas calorias comer por dia?</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              A proteína funciona melhor dentro de uma meta de calorias. Calcule o seu gasto diário.
            </p>
            <NuxtLink to="/calculadora-de-calorias" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular minhas calorias
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>Por que a proteína é o macronutriente determinante na composição corporal</h2>
      <p>
        As proteínas fornecem os aminoácidos essenciais necessários para o reparo das microlesões
        induzidas pelo treinamento resistido. Além de regular o balanço proteico muscular líquido
        (síntese maior que degradação), a proteína apresenta o maior efeito térmico entre os
        macronutrientes: cerca de 20% a 30% da sua energia é gasta apenas no processo de digestão e
        assimilação.
      </p>

      <h2>Recomendações por objetivo segundo a literatura</h2>
      <ul>
        <li v-for="item in goalRecommendations" :key="item.title">
          <b>{{ item.title }}:</b> {{ item.perKg }} de peso corporal por dia.
        </li>
      </ul>
      <p>
        Na restrição de calorias, a necessidade de proteína aumenta: por isso a faixa do emagrecimento
        é a mais alta. Estas faixas são para adultos saudáveis.
      </p>

      <h2>Distribuição ao longo do dia</h2>
      <p>
        Mais importante do que a janela anabólica imediata pós-treino é a distribuição uniforme. Para
        maximizar o estímulo à síntese proteica, recomenda-se fracionar a meta total em
        <b>3 a 5 refeições</b> espaçadas por 3 a 5 horas, com algo entre 20 e 40 g de proteína de boa
        qualidade em cada uma.
      </p>

      <h2>Alimentos ricos em proteína</h2>
      <p>
        Veja quanto de proteína há em 100 gramas de alimentos comuns no dia a dia. Os valores são
        aproximados e variam conforme o preparo e a marca.
      </p>
      <CalculatorDataTable class="mt-3" v-bind="foodsTable" />
      <p class="!text-[0.8rem] !text-muted">
        Fonte: Tabela Brasileira de Composição de Alimentos (TACO, 4ª edição) e tabela de composição
        nutricional do IBGE (2011).
      </p>
      <p>
        Combine a sua meta de proteína com a de calorias na
        <NuxtLink to="/calculadora-de-calorias"><b>Calculadora de Calorias</b></NuxtLink>.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['issn', 'helms']" />
    </div>
  </div>
</template>