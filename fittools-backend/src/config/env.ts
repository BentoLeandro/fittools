import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRATION_DAYS: z.coerce.number().int().positive().default(7),
  // Aceita uma ou mais origens separadas por vírgula
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().url()).min(1))
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Mostra apenas os nomes das variáveis e as mensagens, nunca os valores
  console.error('Variáveis de ambiente inválidas ou ausentes:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
