<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import type { Sex } from '~/types/calculators'
import {
  ACTIVITY_LEVELS,
  DEFAULT_ACTIVITY,
  buildCaloriesResult,
  type CaloriesResult
} from '~/utils/calories-result'
import { applyDefaults } from '~/utils/field-validation'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// Página nova (o site antigo não tinha esta página): o texto foi escrito do zero. As mesmas
// perguntas aparecem na tela e no JSON-LD FAQPage.
const faq: FaqItem[] = [
  {
    question: 'Qual a diferença entre TMB e TDEE?',
    answer:
      'A TMB (taxa metabólica basal) é a energia que o corpo gasta em repouso para manter funções vitais como respiração, circulação e temperatura. O TDEE (gasto energético diário total) é a TMB multiplicada por um fator de atividade e representa o quanto você gasta em um dia comum, incluindo trabalho, treinos e movimentos do cotidiano.'
  },
  {
    question: 'A equação de Mifflin-St Jeor é confiável?',
    answer:
      'Ela é uma das equações mais usadas para estimar a TMB de adultos saudáveis, mas continua sendo uma estimativa baseada em médias da população. Pode errar para pessoas com muita massa muscular, idosos e quem tem condições metabólicas específicas. Use o resultado como ponto de partida e ajuste conforme a sua evolução.'
  },
  {
    question: 'Qual nível de atividade devo escolher?',
    answer:
      'Considere a sua rotina média da semana, incluindo o trabalho e não só os treinos. Na dúvida, escolha o nível mais baixo: é comum superestimar o quanto nos movimentamos, e um gasto superestimado leva a metas de calorias altas demais.'
  },
  {
    question: 'Quantas calorias devo cortar para emagrecer?',
    answer:
      'Um déficit moderado, em torno de 300 a 500 kcal por dia, costuma ser sustentável e ajuda a preservar a massa muscular quando combinado com treino de força e proteína suficiente. Evite déficits muito agressivos e não coma abaixo da sua TMB sem acompanhamento de um nutricionista ou médico.'
  },
  {
    question: 'Por que o resultado é diferente do de outros sites?',
    answer:
      'Cada calculadora pode usar uma equação diferente (Harris-Benedict, Katch-McArdle, Cunningham), fatores de atividade distintos ou arredondamentos próprios. Diferenças de algumas dezenas de calorias são normais e estão dentro da margem de erro de qualquer estimativa.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-calorias',
  title: 'Calculadora de Calorias Diárias (TMB e TDEE) Grátis | FitTools',
  description:
    'Calcule sua TMB e seu gasto calórico diário (TDEE) pela equação de Mifflin-St Jeor e descubra quantas calorias comer para emagrecer, manter ou ganhar peso.',
  ogTitle: 'Calculadora de Calorias e TMB — FitTools',
  ogDescription: 'Descubra seu gasto calórico diário e as calorias ideais para emagrecer, manter ou ganhar peso.',
  appName: 'Calculadora de Calorias FitTools',
  faq
})

// Calculadora para adultos: a equação de Mifflin-St Jeor foi desenvolvida com adultos de 19 a 78 anos.
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
  { type: 'number', name: 'age', label: 'Idade', unit: 'anos', placeholder: '28', min: 18, max: 100, integer: true },
  { type: 'number', name: 'kg', label: 'Peso', unit: 'kg', placeholder: '75', min: 30, max: 300 },
  { type: 'number', name: 'cm', label: 'Altura', unit: 'cm', placeholder: '175', min: 120, max: 230 },
  {
    type: 'select',
    name: 'act',
    label: 'Nível de atividade',
    full: true,
    default: DEFAULT_ACTIVITY,
    options: ACTIVITY_LEVELS.map(level => ({ value: level.value, label: `${level.label} — ${level.description}` }))
  }
]

// Os valores iniciais ja entram preenchidos: o HTML estatico sai com Masculino e Moderado marcados.
const values = ref<FormValues>(applyDefaults(fields, {}))
const result = ref<CaloriesResult | null>(null)

function calculate(parsed: ParsedValues) {
  result.value = buildCaloriesResult({
    sex: parsed.sex as Sex,
    weight_kg: parsed.kg as number,
    height_cm: parsed.cm as number,
    age: parsed.age as number,
    activityFactor: Number(parsed.act)
  })
}

const activityTable = {
  caption: 'Fatores de atividade usados para calcular o gasto calórico diário',
  head: ['Nível', 'Fator', 'Como é a sua semana'],
  rows: ACTIVITY_LEVELS.map(level => [level.label, `×${String(level.factor).replace('.', ',')}`, level.description])
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de Calorias"
      title="Calculadora de Calorias e TMB"
      intro="Descubra quantas calorias o seu corpo gasta por dia e veja metas diárias para emagrecer, manter ou ganhar peso, usando a equação de Mifflin-St Jeor."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule suas calorias</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        submit-label="Calcular minhas calorias"
        aria-labelledby="calc-title"
        @submit="calculate"
      />
      <CalculatorResult
        v-if="result"
        :headline="result.headline"
        :cards="result.cards"
        :table="result.table"
        :note="result.note"
      >
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Quanta proteína comer por dia?</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              Calorias definem o peso; a proteína ajuda a preservar e ganhar músculo. Veja a sua meta diária.
            </p>
            <NuxtLink to="/calculadora-de-proteina" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular minha proteína
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>O que são TMB e TDEE</h2>
      <p>
        A <b>TMB (taxa metabólica basal)</b> é a quantidade de energia que o corpo gasta em repouso
        absoluto só para se manter vivo: bombear o sangue, respirar, regular a temperatura e manter os
        órgãos funcionando. Já o <b>TDEE (gasto energético diário total)</b> soma a isso o que você gasta
        trabalhando, se movimentando e treinando. É a sua referência para saber quantas calorias comer
        para manter o peso.
      </p>

      <h2>Como a TMB é calculada: equação de Mifflin-St Jeor</h2>
      <p>
        Publicada em 1990, a equação de Mifflin-St Jeor é uma das mais usadas na prática clínica e
        esportiva para estimar a TMB de adultos. Ela considera peso, altura, idade e sexo biológico:
      </p>
      <div class="formula">Homens: TMB = (10 × peso em kg) + (6,25 × altura em cm) − (5 × idade) + 5</div>
      <div class="formula">Mulheres: TMB = (10 × peso em kg) + (6,25 × altura em cm) − (5 × idade) − 161</div>
      <p>O TDEE é a TMB multiplicada pelo fator do seu nível de atividade:</p>
      <div class="formula">TDEE = TMB × fator de atividade</div>

      <h2>Fatores de atividade</h2>
      <p>
        Escolha o nível que melhor descreve a sua semana inteira, contando o trabalho e não só os
        treinos. Na dúvida, fique com o nível mais baixo.
      </p>
      <CalculatorDataTable class="mt-3" v-bind="activityTable" />

      <h2>Como usar o resultado para emagrecer, manter ou ganhar peso</h2>
      <ul>
        <li><b>Manter o peso:</b> coma perto do seu TDEE.</li>
        <li>
          <b>Perder gordura:</b> um déficit de cerca de 500 kcal por dia costuma levar a uma perda de
          0,4 a 0,5 kg por semana. É uma regra prática aproximada: o ritmo real varia de pessoa para
          pessoa e muda ao longo do tempo.
        </li>
        <li>
          <b>Ganhar massa:</b> um superávit leve, em torno de 300 kcal por dia, combinado com treino de
          força e proteína suficiente. Calcule a sua na
          <NuxtLink to="/calculadora-de-proteina"><b>Calculadora de Proteína</b></NuxtLink>.
        </li>
      </ul>
      <p>
        Acompanhe o seu peso por 2 a 3 semanas e ajuste as calorias com base na sua evolução real.
        Evite comer abaixo da sua TMB sem acompanhamento de um nutricionista ou médico.
      </p>

      <h2>Limitações da estimativa</h2>
      <p>
        O resultado é uma média calculada para a população adulta. Genética, quantidade de massa
        muscular, alterações hormonais e uso de medicamentos podem fazer o seu gasto real ser diferente.
        A calculadora é indicada para adultos saudáveis; gestantes, lactantes, menores de 18 anos e
        pessoas com doenças metabólicas devem buscar orientação profissional.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['mifflin']" />
    </div>
  </div>
</template>