<script setup lang="ts">
import { CALCULATORS, LEGAL_LINKS, SITE, SOCIAL_LINKS } from '~/utils/site'

const userStore = useUserStore()
const route = useRoute()

// Painel "Calculadoras": no celular ocupa a largura toda, no desktop vira um menu suspenso.
const menuOpen = ref(false)
const menuWrapper = ref<HTMLElement | null>(null)

onClickOutside(menuWrapper, () => {
  menuOpen.value = false
})
onKeyStroke('Escape', () => {
  menuOpen.value = false
})
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  }
)

const initial = computed(() => (userStore.userName.trim().charAt(0) || '?').toUpperCase())

function handleLogout() {
  userStore.logout()
  navigateTo('/')
}

const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#conteudo"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-on-brand"
    >
      Pular para o conteúdo
    </a>

    <header class="sticky top-0 z-50 border-b border-line bg-site-bg/90 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-site items-center justify-between px-5">
        <NuxtLink
          to="/"
          class="text-[1.35rem] font-black tracking-tight text-white hover:no-underline"
          aria-label="FitTools Brasil, página inicial"
        >
          Fit<span class="text-brand">Tools</span>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <div ref="menuWrapper" class="md:relative">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-brand"
              :aria-expanded="menuOpen"
              aria-controls="menu-calculadoras"
              @click="menuOpen = !menuOpen"
            >
              Calculadoras
              <span aria-hidden="true" class="text-xs">{{ menuOpen ? '▴' : '▾' }}</span>
            </button>

            <nav
              v-show="menuOpen"
              id="menu-calculadoras"
              aria-label="Calculadoras"
              class="fixed inset-x-0 top-16 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-line bg-card-bg p-3 shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-3 md:max-h-none md:w-[30rem] md:rounded-[18px] md:border"
            >
              <ul class="grid gap-1 sm:grid-cols-2">
                <li v-for="calculator in CALCULATORS" :key="calculator.path">
                  <NuxtLink
                    :to="calculator.path"
                    class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-site-bg hover:text-brand hover:no-underline"
                  >
                    <span aria-hidden="true" class="text-lg">{{ calculator.icon }}</span>
                    {{ calculator.name }}
                  </NuxtLink>
                </li>
              </ul>
            </nav>
          </div>

          <!-- O estado de login so existe no navegador: o HTML gerado no build e sempre o de
               visitante. Por isso o bloco fica em ClientOnly, com "Entrar" como conteudo inicial. -->
          <ClientOnly>
            <div v-if="userStore.isAuthenticated" class="flex items-center gap-2">
              <NuxtLink
                to="/perfil"
                aria-label="Meu perfil"
                class="grid h-9 w-9 place-items-center rounded-full bg-brand font-extrabold text-on-brand hover:no-underline"
              >
                {{ initial }}
              </NuxtLink>
              <button type="button" class="btn btn-ghost !px-3 !py-1.5" @click="handleLogout">
                Sair
              </button>
            </div>
            <NuxtLink v-else to="/login" class="btn btn-primary !py-2 hover:no-underline">
              Entrar
            </NuxtLink>
            <template #fallback>
              <NuxtLink to="/login" class="btn btn-primary !py-2 hover:no-underline">Entrar</NuxtLink>
            </template>
          </ClientOnly>
        </div>
      </div>
    </header>

    <main id="conteudo" class="flex-1">
      <slot />
    </main>

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

      <div class="mx-auto mt-7 max-w-site border-t border-line px-5 pt-5 text-xs text-[#64748b]">
        <p>© {{ currentYear }} {{ SITE.name }}. Todos os direitos reservados.</p>
        <p class="mt-1">Esta ferramenta não substitui orientação médica ou de nutricionista.</p>
      </div>
    </footer>
  </div>
</template>