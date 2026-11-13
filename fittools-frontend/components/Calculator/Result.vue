<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Tone } from '~/types/calculators'
import type { ResultCard, ResultHeadline, ResultTable } from '~/types/calculator-ui'
import { formatNumber } from '~/utils/format'
import { RESULT_DISCLAIMER } from '~/utils/site'

/**
 * Resultado de uma calculadora: destaque com o número principal e a classificação, cartões
 * informativos, tabela opcional, observação e o aviso "não substitui orientação médica"
 * (Requisito 11.6). A cor vem do `tone`: good (verde), warn (amarelo), bad (vermelho), info (azul).
 *
 * Ao aparecer, recebe o foco e rola até a tela, para quem usa leitor de tela ouvir o resultado.
 * Slot `extra`: conteúdo adicional abaixo da observação (ofertas, links).
 */
const props = withDefaults(
  defineProps<{
    headline: ResultHeadline
    cards?: ResultCard[]
    table?: ResultTable
    /** Observação em destaque (caixa azul). */
    note?: string
    /** Move o foco e rola até o resultado quando ele aparece ou muda. */
    autofocus?: boolean
  }>(),
  { cards: () => [], table: undefined, note: undefined, autofocus: true }
)

// Classes completas (e não montadas em runtime) para o Tailwind enxergá-las no build.
const TONES: Record<Tone, { text: string; border: string }> = {
  good: { text: 'text-brand', border: 'border-brand' },
  warn: { text: 'text-gold', border: 'border-gold' },
  bad: { text: 'text-danger', border: 'border-danger' },
  info: { text: 'text-info', border: 'border-info' }
}
const toneOf = (tone?: Tone) => TONES[tone ?? 'good']

/** Números saem no padrão brasileiro (vírgula decimal); textos já formatados passam direto. */
const show = (value: string | number) => (typeof value === 'number' ? formatNumber(value) : value)

const root = ref<HTMLElement | null>(null)

/** Nome acessível lido quando o foco chega ao resultado. */
const summary = computed(() => {
  const h = props.headline
  const value = `${show(h.value)}${h.unit ? ` ${h.unit}` : ''}`
  return `Resultado: ${h.label}, ${value}${h.status ? `, ${h.status}` : ''}`
})

async function reveal() {
  if (!props.autofocus) return
  await nextTick()
  const el = root.value
  if (!el) return
  el.focus({ preventScroll: true })
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(reveal)
watch(() => props.headline, reveal, { deep: true })
</script>

<template>
  <section
    ref="root"
    tabindex="-1"
    role="region"
    :aria-label="summary"
    class="mt-7 outline-none motion-safe:animate-result-in"
  >
    <div class="rounded-2xl border bg-site-bg p-6 text-center" :class="toneOf(headline.tone).border">
      <p class="text-xs uppercase tracking-[0.08em] text-muted">{{ headline.label }}</p>
      <p class="mt-1.5 break-words text-[clamp(2.4rem,8vw,3rem)] font-black leading-tight" :class="toneOf(headline.tone).text">
        {{ show(headline.value) }}<small v-if="headline.unit" class="ml-1.5 text-lg font-semibold text-muted">{{ headline.unit }}</small>
      </p>
      <p v-if="headline.status" class="mt-2 font-bold" :class="toneOf(headline.tone).text">{{ headline.status }}</p>
    </div>

    <ul
      v-if="cards.length"
      class="mt-3.5 grid list-none grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 p-0"
    >
      <li v-for="card in cards" :key="card.label" class="rounded-[14px] border border-line bg-site-bg p-4 text-center">
        <p class="text-[0.7rem] uppercase tracking-[0.06em] text-muted">{{ card.label }}</p>
        <p class="mt-1 break-words text-xl font-extrabold" :class="card.tone ? toneOf(card.tone).text : 'text-ink'">
          {{ show(card.value) }}<small v-if="card.unit" class="ml-1 text-xs font-semibold text-muted">{{ card.unit }}</small>
        </p>
      </li>
    </ul>

    <CalculatorDataTable v-if="table" class="mt-3.5" v-bind="table" />

    <p v-if="note" role="note" class="mt-3.5 rounded-[14px] border border-info/25 bg-info/[0.07] p-4 text-[0.9rem] text-[#cfe6f7]">
      {{ note }}
    </p>

    <slot name="extra" />

    <p class="mt-4 text-center text-xs text-muted">{{ RESULT_DISCLAIMER }}</p>
  </section>
</template>