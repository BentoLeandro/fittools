<script setup lang="ts">
import type { FaqItem } from '~/utils/seo'

/**
 * Perguntas frequentes. Exibe TODAS as perguntas recebidas; o JSON-LD FAQPage (useCalculatorSeo)
 * deve usar a mesma lista, porque o Google exige que o markup corresponda ao conteúdo visível.
 * `<details>` nativo: abre e fecha com Enter/Espaço sem JavaScript.
 */
withDefaults(defineProps<{ items: FaqItem[]; title?: string }>(), { title: 'Perguntas Frequentes' })
</script>

<template>
  <section>
    <h2>{{ title }}</h2>
    <details
      v-for="item in items"
      :key="item.question"
      class="mb-2.5 rounded-xl border border-line bg-card-bg px-4 py-3.5"
    >
      <summary class="cursor-pointer text-[0.95rem] font-bold text-white">{{ item.question }}</summary>
      <p>{{ item.answer }}</p>
    </details>
  </section>
</template>