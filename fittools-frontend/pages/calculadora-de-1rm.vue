<script setup lang="ts">
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import { buildOneRmResult, type OneRmResult } from '~/utils/onerm-result'
import type { FaqItem } from '~/utils/seo'

definePageMeta({ layout: 'calculator' })

// As três primeiras perguntas vêm do JSON-LD do site antigo (que não as mostrava na tela; agora
// aparecem, porque o Google exige que o markup corresponda ao conteúdo visível). As duas últimas
// são novas.
const faq: FaqItem[] = [
  {
    question: 'O que é 1RM (Uma Repetição Máxima)?',
    answer:
      '1RM é a quantidade máxima de peso que um indivíduo consegue levantar em um determinado exercício com execução técnica completa durante uma única repetição.'
  },
  {
    question: 'Por que usar fórmulas submáximas em vez de testar 1RM diretamente?',
    answer:
      'Testes diretos de 1RM impõem estresse articular extremo e aumentam significativamente o risco de lesões agudas. Fórmulas preditivas permitem estimar a carga máxima a partir de séries seguras de 3 a 10 repetições.'
  },
  {
    question: 'Qual a melhor faixa percentual para hipertrofia?',
    answer:
      'A hipertrofia ocorre eficientemente em uma ampla gama de intensidades (entre 60% e 80% do 1RM, ou 6 a 15 repetições), desde que as séries sejam executadas próximas à falha muscular concêntrica.'
  },
  {
    question: 'Quantas repetições devo usar para estimar o meu 1RM?',
    answer:
      'Prefira uma série de 3 a 10 repetições feita perto da falha, com boa técnica. Quanto mais repetições, menos confiável fica a estimativa, principalmente acima de 10.'
  },
  {
    question: 'A tabela de percentuais vale para todos os exercícios?',
    answer:
      'Ela é uma média. O número de repetições que cada pessoa consegue com uma mesma porcentagem do 1RM pode variar de acordo com o exercício e com o nível de treinamento. Use a tabela como ponto de partida e ajuste as cargas pela sua resposta no treino.'
  }
]

useCalculatorSeo({
  path: '/calculadora-de-1rm',
  title: 'Calculadora de 1RM — Carga Máxima e Repetições (Brzycki & Epley) | FitTools',
  description:
    'Calcule sua repetição máxima (1RM) no supino, agachamento ou levantamento terra sem correr risco de lesão. Obtenha a tabela de percentuais para hipertrofia e força.',
  ogTitle: 'Calculadora de 1RM e Cargas de Treino — FitTools',
  ogDescription: 'Descubra sua força máxima teórica e todas as cargas de treinamento baseadas em percentuais de intensidade.',
  appName: 'Calculadora de 1RM FitTools',
  faq
})

const fields: FieldConfig[] = [
  { type: 'number', name: 'w', label: 'Carga levantada', unit: 'kg', placeholder: '80', min: 1, max: 600 },
  {
    type: 'number',
    name: 'reps',
    label: 'Repetições até a falha',
    unit: 'reps',
    placeholder: '8',
    min: 1,
    max: 20,
    integer: true,
    help: 'Mais preciso entre 1 e 10 repetições.'
  }
]

const values = ref<FormValues>({})
const result = ref<OneRmResult | null>(null)

function calculate(parsed: ParsedValues) {
  result.value = buildOneRmResult(parsed.w as number, parsed.reps as number)
}
</script>

<template>
  <div>
    <CalculatorPageHeader
      name="Calculadora de 1RM"
      title="Calculadora de 1RM (Carga Máxima)"
      intro="Estime seu recorde de 1 repetição máxima e descubra as cargas exatas para cada zona de repetições pela equação de Matt Brzycki."
    />

    <section aria-labelledby="calc-title" class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <h2 id="calc-title" class="sr-only">Calcule seu 1RM</h2>
      <CalculatorForm
        v-model="values"
        :fields="fields"
        submit-label="Calcular meu 1RM"
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
              Para ganhar força e músculo, a alimentação conta tanto quanto o treino. Veja a sua meta de proteína.
            </p>
            <NuxtLink to="/calculadora-de-proteina" class="btn btn-ghost mt-3.5 hover:no-underline">
              Calcular minha proteína
            </NuxtLink>
          </div>
        </template>
      </CalculatorResult>
    </section>

    <article class="calc-prose mt-10">
      <h2>Como funciona a estimativa submáxima de 1RM</h2>
      <p>
        Existe uma relação matemática inversa e previsível entre o número de repetições realizadas até a
        fadiga e a porcentagem da carga máxima suportada. A equação de Brzycki é reconhecida na
        literatura de biomecânica pela precisão superior em faixas de 2 a 10 repetições.
      </p>
      <div class="formula">Brzycki (até 10 repetições): 1RM = Carga levantada (kg) × 36 ÷ (37 − Repetições)</div>
      <div class="formula">Epley (acima de 10 repetições): 1RM = Carga levantada × [1 + (Repetições ÷ 30)]</div>
      <p>
        A fórmula de Brzycki também aparece escrita como 1RM = Carga ÷ [1,0278 − (0,0278 × Repetições)],
        que é equivalente, com os coeficientes arredondados. Com uma única repetição, o 1RM é a própria
        carga levantada.
      </p>

      <h2>Zonas de intensidade e adaptações neuromusculares</h2>
      <ul>
        <li>
          <b>Força máxima e recrutamento neural (85% a 100% do 1RM):</b> 1 a 5 repetições com descansos
          longos (2 a 5 minutos).
        </li>
        <li>
          <b>Hipertrofia miofibrilar e mista (70% a 85% do 1RM):</b> 6 a 12 repetições com descansos de
          60 a 120 segundos.
        </li>
        <li><b>Resistência muscular localizada (55% a 70% do 1RM):</b> 12 a 20 ou mais repetições.</li>
      </ul>

      <h2>Como aplicar no planejamento de sobrecarga progressiva</h2>
      <p>
        Para progredir cargas sem estagnação, registre suas repetições com determinada carga semana a
        semana. Quando conseguir atingir o topo da sua faixa de repetições planejada (ex.: 3 séries de 10
        repetições com 80 kg), suba o peso em 2% a 5% no próximo treino e recomece na base da faixa (ex.:
        3 séries de 6 a 7 repetições).
      </p>
      <p>
        Para treinar com segurança, prefira estimar o 1RM a testá-lo, use sempre um parceiro de treino ou
        os suportes de segurança do equipamento e combine a sua evolução de carga com uma boa
        alimentação, começando pela
        <NuxtLink to="/calculadora-de-proteina"><b>meta diária de proteína</b></NuxtLink>.
      </p>

      <CalculatorFaq :items="faq" />
    </article>

    <div class="mt-9 max-w-[760px]">
      <CalculatorScientificRef :references="['brzycki', 'epley']" />
    </div>
  </div>
</template>