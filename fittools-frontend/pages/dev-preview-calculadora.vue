<script setup lang="ts">
// PAGINA TEMPORARIA: so serve para visualizar o layout de calculadora enquanto a Fase 7 nao
// cria as calculadoras reais. Remover este arquivo e o item em PRIVATE_ROUTES (nuxt.config.ts).
definePageMeta({ layout: 'calculator' })

useHead({ title: 'Pré-visualização do layout de calculadora' })
</script>

<template>
  <div>
    <nav aria-label="Trilha de navegação" class="mb-3 text-xs text-muted">
      <NuxtLink to="/" class="text-muted hover:text-brand">Início</NuxtLink>
      <span aria-hidden="true"> › </span> Calculadora de exemplo
    </nav>

    <h1 class="text-[clamp(1.7rem,4vw,2.5rem)] font-black tracking-tight text-white">
      Calculadora de exemplo
    </h1>
    <p class="mt-2 max-w-3xl text-muted">
      Esta página provisória mostra a moldura que as calculadoras vão usar: cabeçalho, área
      principal, aviso legal e rodapé.
    </p>

    <section class="mt-6 rounded-[18px] border border-line bg-card-bg p-6">
      <p class="text-sm text-muted">Aqui entrará o formulário da calculadora.</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="rounded-[14px] border border-line bg-site-bg p-4 text-center">
          <p class="text-[0.7rem] uppercase tracking-wider text-muted">Exemplo</p>
          <p class="mt-1 text-2xl font-extrabold text-brand">24,5</p>
        </div>
        <div class="rounded-[14px] border border-line bg-site-bg p-4 text-center">
          <p class="text-[0.7rem] uppercase tracking-wider text-muted">Outro exemplo</p>
          <p class="mt-1 text-2xl font-extrabold text-info">1.850 kcal</p>
        </div>
      </div>
    </section>
  </div>
</template>