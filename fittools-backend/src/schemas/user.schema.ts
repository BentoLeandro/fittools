import { ActivityLevel, FitnessGoal, Sex } from '@prisma/client'
import { z } from 'zod'
import { bodyErrors } from './common.schema'

/** Faixas fisiologicamente válidas (iguais aos CHECK da tabela `user_health_profiles`). */
export const HEALTH_PROFILE_LIMITS = {
  weight_kg: { min: 30, max: 300 },
  height_cm: { min: 120, max: 230 },
  age: { min: 14, max: 100 }
} as const

const { weight_kg: WEIGHT, height_cm: HEIGHT, age: AGE } = HEALTH_PROFILE_LIMITS

// Os enums vêm do Prisma Client: o schema nunca fica fora de sincronia com o banco
const enumMessage = (message: string) => ({ errorMap: () => ({ message }) })

const weightSchema = z
  .number({ invalid_type_error: 'Peso deve ser um número' })
  .min(WEIGHT.min, `Peso deve estar entre ${WEIGHT.min} e ${WEIGHT.max} kg`)
  .max(WEIGHT.max, `Peso deve estar entre ${WEIGHT.min} e ${WEIGHT.max} kg`)
  .multipleOf(0.01, 'Peso deve ter no máximo 2 casas decimais')

const heightSchema = z
  .number({ invalid_type_error: 'Altura deve ser um número' })
  .min(HEIGHT.min, `Altura deve estar entre ${HEIGHT.min} e ${HEIGHT.max} cm`)
  .max(HEIGHT.max, `Altura deve estar entre ${HEIGHT.min} e ${HEIGHT.max} cm`)
  .multipleOf(0.01, 'Altura deve ter no máximo 2 casas decimais')

const ageSchema = z
  .number({ invalid_type_error: 'Idade deve ser um número' })
  .int('Idade deve ser um número inteiro')
  .min(AGE.min, `Idade deve estar entre ${AGE.min} e ${AGE.max} anos`)
  .max(AGE.max, `Idade deve estar entre ${AGE.min} e ${AGE.max} anos`)

const sexSchema = z.nativeEnum(Sex, enumMessage("Sexo deve ser 'male' ou 'female'"))

const activityLevelSchema = z.nativeEnum(
  ActivityLevel,
  enumMessage(`Nível de atividade inválido. Valores aceitos: ${Object.values(ActivityLevel).join(', ')}`)
)

const fitnessGoalSchema = z.nativeEnum(
  FitnessGoal,
  enumMessage(`Objetivo inválido. Valores aceitos: ${Object.values(FitnessGoal).join(', ')}`)
)

/**
 * Perfil de saúde. Todos os campos são opcionais (o perfil pode ser parcial) e `null` vale
 * como "sem valor" (o formulário manda `null` quando o usuário apaga um campo).
 * Campos desconhecidos (`id`, `user_id`, `updated_at`) são descartados da saída.
 */
export const healthProfileSchema = z.object(
  {
    weight_kg: weightSchema.nullish(),
    height_cm: heightSchema.nullish(),
    age: ageSchema.nullish(),
    sex: sexSchema.nullish(),
    activity_level: activityLevelSchema.nullish(),
    fitness_goal: fitnessGoalSchema.nullish()
  },
  bodyErrors
)

/**
 * Corpo do `PUT /users/me/profile`, que SUBSTITUI o perfil inteiro (Requisito 5.6): o que não
 * vier é apagado. Por isso um corpo sem nenhum dos seis campos (`{}` ou só campos desconhecidos)
 * é recusado, para nunca apagar o perfil por engano. Para limpar de propósito, envie `null`.
 */
export const healthProfileReplaceSchema = healthProfileSchema.refine((data) => Object.keys(data).length > 0, {
  message: 'Informe pelo menos um campo do perfil'
})
/** Perfil já validado (saída do schema). */
export type HealthProfileInput = z.infer<typeof healthProfileSchema>