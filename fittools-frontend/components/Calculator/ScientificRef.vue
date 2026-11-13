<script setup lang="ts">
import { useId } from 'vue'
import type { ReferenceKey } from '~/types/calculators'
import { SCIENCE_REFERENCES } from '~/composables/useScience'

/**
 * Seção "Referências Científicas" (Requisitos 11.1 e 11.2): autores, título, fonte e ano de cada
 * pesquisa original usada pela calculadora. Renderiza texto puro (sem HTML).
 */
withDefaults(
  defineProps<{
    /** Chaves das citações a exibir, na ordem desejada. */
    references: ReferenceKey[]
    title?: string
  }>(),
  { title: 'Referências Científicas' }
)

const headingId = useId()
</script>

<template>
  <section :aria-labelledby="headingId">
    <h2 :id="headingId" class="text-[1.3rem] font-extrabold text-white">{{ title }}</h2>
    <ol class="mt-3 grid list-none gap-2.5 p-0">
      <li
        v-for="key in references"
        :key="key"
        class="rounded-xl border border-line bg-site-bg px-4 py-3.5 text-[0.8rem] text-muted"
      >
        {{ SCIENCE_REFERENCES[key].authors }}
        <cite class="font-bold not-italic text-ink">{{ SCIENCE_REFERENCES[key].title }}</cite>
        {{ SCIENCE_REFERENCES[key].source }}
      </li>
    </ol>
  </section>
</template>