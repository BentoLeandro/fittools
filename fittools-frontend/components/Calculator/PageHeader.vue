<script setup lang="ts">
/**
 * Topo de uma página de calculadora: trilha de navegação, título (h1) e introdução.
 * Reutilizado pelas 8 páginas de calculadora.
 */
defineProps<{
  /** Nome curto exibido na trilha, ex.: "Calculadora de IMC". */
  name: string
  title: string
  intro: string
}>()
</script>

<template>
  <header>
    <nav aria-label="Trilha de navegação" class="mb-3 text-xs text-muted">
      <ol class="flex list-none flex-wrap gap-x-1.5 p-0">
        <li>
          <NuxtLink to="/" class="text-muted hover:text-brand">Início</NuxtLink>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page">{{ name }}</li>
      </ol>
    </nav>
    <h1 class="text-[clamp(1.7rem,4vw,2.5rem)] font-black tracking-tight text-white">{{ title }}</h1>
    <p class="mt-2 max-w-3xl text-muted">{{ intro }}</p>
  </header>
</template>