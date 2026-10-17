<script setup lang="ts">
import { CALCULATOR_DISCLAIMER } from '~/utils/site'
</script>

<template>
  <!-- Reaproveita o layout padrao (cabecalho e rodape) e acrescenta so a moldura de calculadora:
       area principal larga, coluna de leitura para o conteudo editorial e o aviso legal
       obrigatorio (Requisito 11.3). A pagina escolhe as partes pelos slots do conteudo. -->
  <NuxtLayout name="default">
    <div class="mx-auto w-full max-w-site px-5 pb-2 pt-10 md:pt-12">
      <slot />

      <p
        role="note"
        class="mt-10 rounded-[14px] border border-danger/30 bg-danger/10 p-4 text-[0.82rem] text-[#ffd9da]"
      >
        {{ CALCULATOR_DISCLAIMER }}
      </p>
    </div>
  </NuxtLayout>
</template>