<script setup lang="ts">
import { CALCULATORS, SITE } from '~/utils/site'

const title = 'FitTools Brasil — Calculadoras Fitness Gratuitas'
const description =
  'Calcule IMC, calorias, proteína, gordura corporal, 1RM, zonas de frequência cardíaca, hidratação e pace de corrida. Gratuito, com fórmulas científicas.'

const site = useSiteConfig()

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogSiteName: SITE.name,
  ogLocale: 'pt_BR',
  ogUrl: `${site.url}/`
})

// A Task 9.1 revisa canonical e Twitter Card em todas as paginas; a home ja sai com canonical.
useHead({ link: [{ rel: 'canonical', href: `${site.url}/` }] })
</script>

<template>
  <div>
    <section class="mx-auto max-w-site px-5 pb-10 pt-14 text-center md:pb-14 md:pt-20">
      <h1
        class="text-[clamp(2rem,5.5vw,3.6rem)] font-black leading-[1.1] tracking-[-0.035em] text-white"
      >
        Calculadoras fitness <em class="not-italic text-brand">baseadas em ciência</em>
      </h1>
      <p class="mx-auto mt-5 max-w-2xl text-[1.05rem] text-muted">
        IMC, calorias, proteína, gordura corporal, 1RM, zonas de frequência cardíaca, hidratação e
        pace de corrida. Gratuitas, sem precisar de cadastro e com as equações científicas
        explicadas.
      </p>
      <a href="#calculadoras" class="btn btn-primary mt-8 !px-8 !py-3.5 !text-base hover:no-underline">
        Começar Agora
      </a>
    </section>

    <section id="calculadoras" class="mx-auto max-w-site scroll-mt-24 px-5 pb-6">
      <h2 class="mb-5 text-xl font-extrabold text-white md:text-2xl">Escolha uma calculadora</h2>

      <ul class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <li v-for="calculator in CALCULATORS" :key="calculator.path">
          <NuxtLink
            :to="calculator.path"
            class="group flex h-full flex-col rounded-[18px] border border-line bg-card-bg p-4 transition duration-200 hover:-translate-y-1 hover:border-brand hover:no-underline motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
          >
            <span aria-hidden="true" class="text-[1.7rem] leading-none">{{ calculator.icon }}</span>
            <h3 class="mt-3 text-base font-bold text-white group-hover:text-brand">
              {{ calculator.name }}
            </h3>
            <p class="mt-1 text-[0.85rem] leading-snug text-muted">{{ calculator.description }}</p>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>