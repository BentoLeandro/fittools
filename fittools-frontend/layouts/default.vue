<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#conteudo"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-on-brand"
    >
      Pular para o conteúdo
    </a>

    <CommonHeader />

    <main id="conteudo" class="flex-1">
      <slot />
    </main>

    <CommonFooter />

    <!-- Notificacoes globais: qualquer pagina dispara com useToast(). -->
    <CommonToast />
  </div>
</template>