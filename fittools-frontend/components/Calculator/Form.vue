<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type { FieldConfig, FormValues, ParsedValues } from '~/types/calculator-ui'
import { applyDefaults, isFieldVisible, parseValues, validateForm } from '~/utils/field-validation'
import CalculatorField from './Field.vue'

/**
 * Formulário de calculadora guiado por configuração: recebe a lista de campos (`fields`),
 * valida cada um com as faixas plausíveis (Requisito 1.9), mostra os erros inline em português
 * (Requisito 9.6) e só emite `submit` com os valores já convertidos quando tudo está válido.
 *
 * Slots: `before` (acima dos campos), `after` (entre os campos e o botão) e `actions`
 * (substitui o botão padrão).
 */
const props = withDefaults(
  defineProps<{
    fields: FieldConfig[]
    submitLabel?: string
    /** Desabilita o botão e marca o formulário como ocupado. */
    loading?: boolean
    /** Erro do cálculo (ex.: medidas incoerentes), exibido acima do botão. */
    error?: string
  }>(),
  { submitLabel: 'Calcular', loading: false, error: undefined }
)

const emit = defineEmits<{
  submit: [values: ParsedValues]
  invalid: [errors: Record<string, string>]
}>()

const model = defineModel<FormValues>({ default: () => ({}) })

// Valores iniciais (`default`) entram já na primeira renderização, para o HTML estático e o
// navegador mostrarem a mesma coisa.
const initialValues = applyDefaults(props.fields, model.value)
if (Object.keys(initialValues).some(key => initialValues[key] !== model.value[key])) {
  model.value = initialValues
}

const touched = reactive<Record<string, boolean>>({})
const submitted = ref(false)
const fieldRefs = new Map<string, { focus: () => void }>()

const visibleFields = computed(() => props.fields.filter(f => isFieldVisible(f, model.value)))
const errors = computed(() => validateForm(props.fields, model.value))
const errorCount = computed(() => Object.keys(errors.value).length)

function showValidation(name: string) {
  return submitted.value || !!touched[name]
}

function setValue(name: string, value: string) {
  model.value = { ...model.value, [name]: value }
}

function setRef(name: string, instance: unknown) {
  if (instance) fieldRefs.set(name, instance as { focus: () => void })
  else fieldRefs.delete(name)
}

async function onSubmit() {
  submitted.value = true
  if (errorCount.value > 0) {
    emit('invalid', errors.value)
    await nextTick()
    // Leva o foco ao primeiro campo com erro, na ordem em que aparecem na tela
    const first = visibleFields.value.find(f => errors.value[f.name])
    if (first) fieldRefs.get(first.name)?.focus()
    return
  }
  emit('submit', parseValues(props.fields, model.value))
}
</script>

<template>
  <form novalidate :aria-busy="loading ? 'true' : undefined" @submit.prevent="onSubmit">
    <slot name="before" />

    <div class="grid gap-4 sm:grid-cols-2">
      <CalculatorField
        v-for="field in visibleFields"
        :key="field.name"
        :ref="instance => setRef(field.name, instance)"
        :class="field.full || field.type === 'radio' ? 'sm:col-span-2' : ''"
        :field="field"
        :model-value="model[field.name] ?? ''"
        :error="errors[field.name]"
        :show-validation="showValidation(field.name)"
        @update:model-value="setValue(field.name, $event)"
        @blur="touched[field.name] = true"
      />
    </div>

    <slot name="after" />

    <!-- role=alert: o leitor de tela anuncia assim que o aviso aparece -->
    <p v-if="submitted && errorCount > 0" role="alert" class="mt-4 text-[0.88rem] font-semibold text-danger">
      {{
        errorCount === 1
          ? 'Corrija 1 campo para calcular.'
          : `Corrija ${errorCount} campos para calcular.`
      }}
    </p>
    <p v-else-if="error" role="alert" class="mt-4 text-[0.88rem] font-semibold text-danger">{{ error }}</p>

    <div class="mt-5">
      <slot name="actions" :loading="loading">
        <button type="submit" class="btn btn-primary w-full py-3.5 text-base sm:w-auto sm:px-7" :disabled="loading">
          {{ submitLabel }}
        </button>
      </slot>
    </div>
  </form>
</template>