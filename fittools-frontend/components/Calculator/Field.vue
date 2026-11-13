<script setup lang="ts">
import { computed, useId } from 'vue'
import type { FieldConfig } from '~/types/calculator-ui'

/**
 * Um campo de calculadora: número (com unidade), lista (select) ou opções (radio).
 * É só apresentação: quem valida é o Calculator/Form (utils/field-validation). O campo recebe a
 * mensagem de erro pronta e mostra o estado visual (vermelho para erro, verde para válido).
 */
const props = defineProps<{
  field: FieldConfig
  /** Mensagem de erro do campo (null/undefined = sem erro). */
  error?: string | null
  /** Só mostra erro/válido depois que o usuário mexeu no campo ou tentou enviar. */
  showValidation?: boolean
}>()

const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()

const uid = useId()
const inputId = `${uid}-input`
const helpId = `${uid}-help`
const errorId = `${uid}-error`

const hasError = computed(() => !!props.showValidation && !!props.error)
const isValid = computed(
  () => !!props.showValidation && !props.error && props.field.type === 'number' && model.value.trim() !== ''
)
const isOptional = computed(() => props.field.required === false)

const describedBy = computed(
  () =>
    [props.field.help ? helpId : '', hasError.value ? errorId : ''].filter(Boolean).join(' ') || undefined
)

const controlState = computed(() =>
  hasError.value
    ? 'border-danger'
    : isValid.value
      ? 'border-brand/70'
      : 'border-line-2 focus:border-brand'
)

const inputMode = computed(() =>
  props.field.type === 'number' && props.field.integer ? 'numeric' : 'decimal'
)

function onInput(event: Event) {
  model.value = (event.target as HTMLInputElement | HTMLSelectElement).value
}

/** Leva o foco ao controle (usado pelo formulário no primeiro campo com erro). */
function focus() {
  document.getElementById(inputId)?.focus()
}

defineExpose({ focus })
</script>

<template>
  <!-- Radio: grupo com fieldset/legend, que é o jeito semântico de rotular opções -->
  <fieldset
    v-if="field.type === 'radio'"
    :aria-describedby="describedBy"
    class="min-w-0"
  >
    <legend class="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
      {{ field.label }}
      <span v-if="isOptional" class="ml-1 font-semibold normal-case tracking-normal">(opcional)</span>
    </legend>
    <div class="flex flex-wrap gap-2">
      <label
        v-for="(option, index) in field.options"
        :key="option.value"
        class="flex min-h-[46px] cursor-pointer items-center rounded-xl border px-4 py-2.5 text-[0.95rem] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
        :class="[
          model === option.value
            ? 'border-brand bg-brand/10 font-bold text-white'
            : hasError
              ? 'border-danger text-ink hover:border-brand'
              : 'border-line-2 text-ink hover:border-brand'
        ]"
      >
        <input
          :id="index === 0 ? inputId : undefined"
          type="radio"
          class="sr-only"
          :name="`${uid}-${field.name}`"
          :value="option.value"
          :checked="model === option.value"
          @change="onInput"
          @blur="emit('blur')"
        />
        {{ option.label }}
      </label>
    </div>
    <p v-if="field.help" :id="helpId" class="mt-1.5 text-[0.72rem] text-muted">{{ field.help }}</p>
    <p v-if="hasError" :id="errorId" class="mt-1.5 text-[0.8rem] font-semibold text-danger">{{ error }}</p>
  </fieldset>

  <div v-else class="min-w-0">
    <label :for="inputId" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
      {{ field.label }}
      <span v-if="field.type === 'number' && field.unit" class="sr-only">({{ field.unit }})</span>
      <span v-if="isOptional" class="ml-1 font-semibold normal-case tracking-normal">(opcional)</span>
    </label>

    <div v-if="field.type === 'number'" class="relative">
      <input
        :id="inputId"
        type="text"
        :inputmode="inputMode"
        autocomplete="off"
        :name="field.name"
        :placeholder="field.placeholder"
        :value="model"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-required="isOptional ? undefined : 'true'"
        :aria-describedby="describedBy"
        class="w-full rounded-xl border bg-site-bg py-3 pl-3.5 text-base text-ink placeholder:text-muted/60"
        :class="[controlState, field.unit ? 'pr-14' : 'pr-3.5']"
        @input="onInput"
        @blur="emit('blur')"
      />
      <span
        v-if="field.unit"
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted"
      >
        {{ field.unit }}
      </span>
    </div>

    <select
      v-else
      :id="inputId"
      :name="field.name"
      :value="model"
      :aria-invalid="hasError ? 'true' : undefined"
      :aria-required="isOptional ? undefined : 'true'"
      :aria-describedby="describedBy"
      class="w-full rounded-xl border bg-site-bg px-3.5 py-3 text-base text-ink [color-scheme:dark]"
      :class="controlState"
      @change="onInput"
      @blur="emit('blur')"
    >
      <option v-if="model === ''" value="" disabled>Selecione…</option>
      <option v-for="option in field.options" :key="option.value" :value="option.value" :selected="option.value === model">
        {{ option.label }}
      </option>
    </select>

    <p v-if="field.help" :id="helpId" class="mt-1.5 text-[0.72rem] text-muted">{{ field.help }}</p>
    <p v-if="hasError" :id="errorId" class="mt-1.5 text-[0.8rem] font-semibold text-danger">{{ error }}</p>
  </div>
</template>