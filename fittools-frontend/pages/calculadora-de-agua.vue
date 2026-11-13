<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import { HYDRATION_TIPS, buildWaterResult, type WaterResult } from '~/utils/water-result'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// As três primeiras perguntas vêm do JSON-LD do site antigo (que não as mostrava na tela; agora
// aparecem, porque o Google exige que o markup corresponda ao conteúdo visível). As respostas
// sobre desidratação e sobre café e chá foram reescritas com mais cautela. As duas últimas
// perguntas são novas.
const faq: FaqItem[] = [
  {
    question: "A regra de '2 litros de água por dia' é válida?",
    answer:
      'Não de forma universal. Uma pessoa de 50 kg sedentária tem necessidades hídricas completamente distintas de um indivíduo de 95 kg que treina em clima quente. O cálculo deve ser proporcional ao peso e ao suor.'
  },
  {
    question: 'Como a desidratação afeta o treino de musculação?',
    answer:
      'Perder mais de 2% do peso corporal em água pode prejudicar o desempenho, principalmente em exercícios longos e no calor, além de aumentar a frequência cardíaca e a sensação de esforço. Em treinos de força o efeito costuma ser menor, mas a hidratação adequada ajuda a manter o rendimento e o bem-estar.'
  },
  {
    question: 'Bebidas como café e chá contam na hidratação diária?',
    answer:
      'Sim. Embora a cafeína tenha um leve efeito diurético em quem não está habituado, no consumo habitual cafés e chás contribuem para a hidratação total ao longo do dia.'
  },
  {
    question: 'Preciso de bebida isotônica para treinar?',
    answer:
      'Para a maioria dos treinos de até 1 hora, a água é suficiente. Em treinos mais longos, no calor ou com muito suor, bebidas com sódio e carboidrato podem ajudar a repor o que se perde e a manter o rendimento.'
  },
  {
    question: 'É possível beber água demais?',
    answer:
      'Sim. Beber muito além do necessário, principalmente durante treinos longos, pode diluir o sódio do sangue (hiponatremia), com sintomas como náusea, dor de cabeça e confusão. Beba conforme a sede e a sua perda de suor e, se tiver esses sintomas, procure atendimento médico.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-agua',
  title: 'Calculadora de Hidratação Diária — Água por Peso e Treino | FitTools',
  description:
    'Calcule quantos litros de água beber por dia conforme seu peso corporal e tempo diário de atividade física. Baseado no posicionamento do ACSM.',
  ogTitle: 'Calculadora de Hidratação Diária — FitTools',
  ogDescription: 'Descubra sua meta exata de água considerando sua massa corporal e o volume de suor perdido nos treinos.',
  appName: 'Calculadora de Água FitTools',
  faq
})

const fields: FieldConfig[] = [
  { type: 'number', name: 'kg', label: 'Peso corporal', unit: 'kg', placeholder: '75', min: 30, max: 300 },
  {
    type: 'number',
    name: 'min',
    label: 'Minutos de treino por dia',
    unit: 'min',
    placeholder: '60',
    min: 0,
    max: 300,
    required: false
  }
]

const values = ref<FormValues>({})
const result = ref<WaterResult | null>(null)

function calculate(parsed: ParsedValues) {
  result.value = buildWaterResult(parsed.kg as number, (parsed.min as number | undefined) ?? 0)
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de hidratação"
      title="Calculadora de Hidratação Diária"
      intro="Descubra seu consumo hídrico ideal diário integrando a taxa metabólica basal de líquidos e a reposição do volume de suor perdido no treino."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule a sua meta de água</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        submit-label="Calcular minha hidratação"
        aria-labelledby="calc-title"
        @submit="calculate"
      />
      <CalculatorResult v-if="result" :headline="result.headline" :cards="result.cards" :note="result.note">
        <template #extra>
          <div class="mt-3.5 rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1b1440] to-[#0f2740] p-5">
            <h3 class="text-[1.05rem] font-bold text-white">Quantas calorias comer por dia?</h3>
            <p class="mt-1.5 text-[0.88rem] text-[#c6d3e8]">
              Água e alimentação andam juntas. Calcule também o seu gasto calórico diário.
            </p>
            <NuxtLink to="/calculadora-de-calorias" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular minhas calorias
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>A fisiologia da hidratação no esporte</h2>
      <p>
        A água atua como solvente biológico fundamental, transportadora de eletrólitos e principal
        reguladora térmica do organismo. O tecido muscular esquelético é composto por aproximadamente 75%
        de água. A desidratação pode diminuir a volemia sanguínea e elevar a frequência cardíaca para a
        mesma carga de esforço.
      </p>

      <h2>Fórmula de cálculo adotada</h2>
      <div class="formula">Consumo base = 35 mL × Peso corporal (kg)</div>
      <div class="formula">Adicional de exercício = ~700 mL por hora de atividade moderada a intensa</div>
      <div class="formula">Meta total = Base + Adicional de exercício</div>
      <p>
        É uma regra prática: a perda de suor varia bastante de pessoa para pessoa e com o clima, e parte
        da água da sua dieta vem dos alimentos. Use o resultado como ponto de partida.
      </p>

      <h2>Dicas de hidratação antes, durante e depois do treino</h2>
      <ul>
        <li v-for="tip in HYDRATION_TIPS" :key="tip.when">
          <b>{{ tip.title }}:</b> {{ tip.text }}
        </li>
      </ul>

      <h2>Indicadores práticos de hidratação</h2>
      <p>A cor da urina ao longo do dia é uma ferramenta visual simples:</p>
      <ul>
        <li><b>Amarelo muito claro / palha:</b> nível adequado de hidratação.</li>
        <li><b>Amarelo escuro:</b> sinal de que você precisa de mais líquido. Beba água ao longo da próxima hora.</li>
        <li>
          <b>Âmbar / castanho:</b> desidratação importante. Reponha líquidos e, se a cor persistir mesmo
          bebendo, procure atendimento médico.
        </li>
      </ul>
      <p>
        Alguns alimentos, vitaminas do complexo B e medicamentos também mudam a cor da urina, então
        considere isso na hora de interpretar.
      </p>

      <h2>Limitações da estimativa</h2>
      <p>
        A meta é uma estimativa para adultos saudáveis. Quem tem doença renal ou cardíaca, usa
        medicamentos diuréticos, está grávida ou tem orientação médica de restrição de líquidos deve
        seguir o que o profissional indicar. Beber demais também faz mal.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['acsm']" />
    </div>
  </div>
</template>