<script setup lang="ts">
import { CALCULATORS, LEGAL_LINKS, SITE, SOCIAL_LINKS } from '~/utils/site'

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="mt-14 border-t border-line bg-footer-bg pb-8 pt-10 text-[0.85rem]">
    <div class="mx-auto grid max-w-site gap-8 px-5 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <p class="text-xl font-black tracking-tight text-white">
          Fit<span class="text-brand">Tools</span>
        </p>
        <p class="mt-2 max-w-xs text-muted">{{ SITE.tagline }}</p>
      </div>

      <nav aria-label="Calculadoras no rodapé">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Calculadoras</h2>
        <ul>
          <li v-for="calculator in CALCULATORS" :key="calculator.path">
            <NuxtLink
              :to="calculator.path"
              class="block py-1 text-[#93a4bd] transition-colors hover:text-brand hover:no-underline"
            >
              {{ calculator.name }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <nav aria-label="Institucional">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Institucional</h2>
        <ul>
          <li v-for="link in LEGAL_LINKS" :key="link.path">
            <NuxtLink
              :to="link.path"
              class="block py-1 text-[#93a4bd] transition-colors hover:text-brand hover:no-underline"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
          <li>
            <a
              :href="`mailto:${SITE.contactEmail}`"
              class="block py-1 text-[#93a4bd] transition-colors hover:text-brand hover:no-underline"
            >
              {{ SITE.contactEmail }}
            </a>
          </li>
        </ul>

        <ul v-if="SOCIAL_LINKS.length" class="mt-4" aria-label="Redes sociais">
          <li v-for="link in SOCIAL_LINKS" :key="link.url">
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="block py-1 text-[#93a4bd] transition-colors hover:text-brand hover:no-underline"
            >
              {{ link.label }}
            </a>
          </li>
        </ul>
      </nav>
    </div>

    <div class="mx-auto mt-7 max-w-site border-t border-line px-5 pt-5 text-xs text-[#8394ac]">
      <p>© {{ currentYear }} {{ SITE.name }}. Todos os direitos reservados.</p>
      <p class="mt-1">Esta ferramenta não substitui orientação médica ou de nutricionista.</p>
    </div>
  </footer>
</template>