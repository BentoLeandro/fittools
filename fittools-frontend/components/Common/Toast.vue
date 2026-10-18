<script setup lang="ts">
import type { ToastType } from '~/composables/useToast'

const { toasts, dismiss, pause, resume } = useToast()

const styles: Record<ToastType, { box: string; icon: string; label: string }> = {
  success: { box: 'border-brand/50', icon: '✓', label: 'Sucesso' },
  error: { box: 'border-danger/60', icon: '!', label: 'Erro' },
  info: { box: 'border-info/50', icon: 'i', label: 'Informação' }
}

const iconColor: Record<ToastType, string> = {
  success: 'bg-brand text-on-brand',
  error: 'bg-danger text-white',
  info: 'bg-info text-on-brand'
}
</script>

<template>
  <!-- A regiao precisa existir antes dos avisos para os leitores de tela anunciarem cada um. -->
  <div
    role="region"
    aria-live="polite"
    aria-label="Notificações"
    class="pointer-events-none fixed inset-x-4 top-20 z-[70] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-5 sm:w-96"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-x-6 opacity-0 motion-reduce:translate-x-0"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-x-6 opacity-0 motion-reduce:translate-x-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex w-full items-start gap-3 rounded-[14px] border bg-card-bg p-4 shadow-xl"
        :class="styles[toast.type].box"
        @mouseenter="pause(toast.id, 'hover')"
        @mouseleave="resume(toast.id, 'hover')"
        @focusin="pause(toast.id, 'focus')"
        @focusout="resume(toast.id, 'focus')"
      >
        <span
          aria-hidden="true"
          class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-black"
          :class="iconColor[toast.type]"
        >
          {{ styles[toast.type].icon }}
        </span>
        <p class="flex-1 text-sm text-ink">
          <span class="sr-only">{{ styles[toast.type].label }}: </span>{{ toast.message }}
        </p>
        <button
          type="button"
          class="-m-1 rounded-md p-1 text-muted transition-colors hover:text-white"
          aria-label="Fechar notificação"
          @click="dismiss(toast.id)"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>