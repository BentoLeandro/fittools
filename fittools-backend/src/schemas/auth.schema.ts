import { z } from 'zod'
import { MAX_PASSWORD_BYTES } from '../services/auth.service'

// Limites das colunas de `users` (prisma/schema.prisma): email VARCHAR(255) e name VARCHAR(100).
const EMAIL_MAX_LENGTH = 255
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 100
const PASSWORD_MIN_LENGTH = 8

/**
 * Nome: começa com uma letra (de qualquer idioma) e só tem letras, acentos soltos,
 * espaço, hífen e apóstrofo (reto ' ou o curvo ’ que o teclado do iPhone insere).
 */
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}'’ -]*$/u

const emailSchema = z
  .string({ required_error: 'Informe o email', invalid_type_error: 'Email inválido' })
  // Normaliza antes de validar, para " Maria@Example.com " ser aceito como "maria@example.com"
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, 'Informe o email')
      .email('Email inválido')
      .max(EMAIL_MAX_LENGTH, `Email deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres`)
  )

const nameSchema = z
  .string({ required_error: 'Informe o nome', invalid_type_error: 'Nome inválido' })
  // NFC junta letra e acento ("a" + "~" vira "ã"); espaços repetidos viram um só
  .transform((value) => value.normalize('NFC').trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(NAME_MIN_LENGTH, `Nome deve ter pelo menos ${NAME_MIN_LENGTH} caracteres`)
      .max(NAME_MAX_LENGTH, `Nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres`)
      .regex(NAME_PATTERN, 'Nome deve conter apenas letras, espaços, hífens e apóstrofos')
  )

/**
 * Senha nova (cadastro). Não é cortada nem alterada, exceto pela normalização NFC, que
 * também é aplicada no login para a mesma senha digitada em teclados diferentes gerar o mesmo hash.
 */
const newPasswordSchema = z
  .string({ required_error: 'Informe a senha', invalid_type_error: 'Senha inválida' })
  .transform((value) => value.normalize('NFC'))
  .pipe(
    z
      .string()
      // Conta caracteres de verdade: um emoji vale 1, não 2
      .refine((value) => Array.from(value).length >= PASSWORD_MIN_LENGTH, {
        message: `Senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`
      })
      // O bcrypt ignora tudo depois de 72 bytes (ver auth.service.ts)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES, {
        message: `Senha muito longa: máximo de ${MAX_PASSWORD_BYTES} bytes (cerca de ${MAX_PASSWORD_BYTES} caracteres sem acentos)`
      })
      .refine((value) => /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /\p{Nd}/u.test(value), {
        message: 'Senha deve conter letras maiúsculas, minúsculas e números'
      })
  )

/** Senha no login: sem regras de formato (quem decide é o hash), só precisa existir. */
const loginPasswordSchema = z
  .string({ required_error: 'Informe a senha', invalid_type_error: 'Senha inválida' })
  .min(1, 'Informe a senha')
  .transform((value) => value.normalize('NFC'))

const bodyErrors = {
  required_error: 'Corpo da requisição ausente',
  invalid_type_error: 'Corpo da requisição deve ser um objeto JSON'
}

export const registerSchema = z.object(
  { email: emailSchema, password: newPasswordSchema, name: nameSchema },
  bodyErrors
)

export const loginSchema = z.object({ email: emailSchema, password: loginPasswordSchema }, bodyErrors)

/** Dados já validados e normalizados (saída do schema). */
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>