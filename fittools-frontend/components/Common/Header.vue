<script setup lang="ts">
import { CALCULATORS } from '~/utils/site'

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

// Sem nome carregado (token salvo mas usuario ainda nao buscado, ou API fora do ar) a inicial
// fica vazia e o avatar mostra um icone neutro em vez de um caractere sem sentido.
const initial = computed(() => userStore.userName.trim().charAt(0).toUpperCase())

function handleLogout() {
  userStore.logout()
  navigateTo('/')
}
</script>

<template>
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
              <template v-if="initial">{{ initial }}</template>
              <svg v-else aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-4.1 0-7.5 2.2-7.5 4.9V21h15v-1.85c0-2.7-3.4-4.9-7.5-4.9Z" />
              </svg>
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
</template>