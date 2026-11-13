<script setup lang="ts">
/**
 * Tabela de dados acessível: `caption` para leitores de tela, cabeçalhos com `scope` e
 * rolagem horizontal por teclado (tabindex=0) quando a tabela é mais larga que a tela.
 * Usada no resultado das calculadoras e nos textos editoriais.
 */
withDefaults(
  defineProps<{
    caption: string
    head: string[]
    rows: string[][]
    /** Destaca em negrito a primeira coluna (rótulo da linha). */
    strongFirstColumn?: boolean
  }>(),
  { strongFirstColumn: true }
)
</script>

<template>
  <div class="overflow-x-auto rounded-[14px] border border-line" role="region" :aria-label="caption" tabindex="0">
    <table class="w-full border-collapse text-left text-sm">
      <caption class="sr-only">{{ caption }}</caption>
      <thead>
        <tr class="bg-site-bg text-xs uppercase tracking-wider text-muted">
          <th v-for="column in head" :key="column" scope="col" class="px-4 py-2.5 font-bold">{{ column }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index" class="border-t border-line">
          <td
            v-for="(cell, cellIndex) in row"
            :key="cellIndex"
            class="px-4 py-2.5 text-[#c3cddd]"
            :class="cellIndex === 0 && strongFirstColumn ? 'font-bold text-white' : ''"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>