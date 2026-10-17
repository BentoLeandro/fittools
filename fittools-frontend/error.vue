<script setup lang="ts">
import type { NuxtError } from '#app'
import { CALCULATORS } from '~/utils/site'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

const title = computed(() => (is404.value ? 'Página não encontrada' : 'Algo deu errado'))

// Texto fixo de proposito: nunca exibimos a mensagem do erro, que pode ter detalhes tecnicos.
const message = computed(() =>
  is404.value
    ? 'O endereço que você acessou não existe ou foi movido. Que tal começar por uma das nossas calculadoras?'
    : 'Tivemos um problema inesperado. Tente novamente em instantes.'
)

useHead({ title: () => `${title.value} | FitTools Brasil` })

// Sair da tela de erro exige limpar o erro; so trocar de rota manteria a tela de erro.
function goTo(path: string) {
  clearError({ redirect: path })
}
</script>

<template>
  <NuxtLayout>
    <section class="mx-auto flex max-w-site flex-col items-center px-5 py-16 text-center md:py-24">
      <p
        v-if="is404"
        class="text-7xl font-black leading-none text-brand md:text-9xl"
        aria-hidden="true"
      >
        404
      </p>
      <p v-else class="text-6xl" aria-hidden="true">⚠️</p>

      <h1 class="mt-6 text-3xl font-black tracking-tight text-white md:text-4xl">{{ title }}</h1>
      <p class="mt-3 max-w-xl text-muted">{{ message }}</p>

      <a href="/" class="btn btn-primary mt-8" @click.prevent="goTo('/')">
        Voltar para a página inicial
      </a>

      <nav aria-label="Calculadoras" class="mt-14 w-full max-w-2xl">
        <h2 class="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Calculadoras</h2>
        <ul class="grid gap-2 text-left sm:grid-cols-2">
          <li v-for="calculator in CALCULATORS" :key="calculator.path">
            <a
              :href="calculator.path"
              class="flex items-center gap-3 rounded-xl border border-line bg-card-bg px-4 py-3 text-sm text-ink transition-colors hover:border-brand hover:text-brand hover:no-underline"
              @click.prevent="goTo(calculator.path)"
            >
              <span aria-hidden="true" class="text-lg">{{ calculator.icon }}</span>
              {{ calculator.name }}
            </a>
          </li>
        </ul>
      </nav>
    </section>
  </NuxtLayout>
</template>