import type { z } from 'zod'
import { ValidationError } from './errors.util'

/**
 * Valida `data` com o schema e devolve o resultado já normalizado.
 * Se falhar, lança `ValidationError` com UMA mensagem por campo (a primeira, que é a mais
 * relevante). Erros do corpo inteiro (ausente, não é objeto) viram a `message` da resposta.
 */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  }

  const fields: Record<string, string> = {}
  let bodyMessage: string | undefined

  for (const issue of result.error.issues) {
    if (issue.path.length === 0) {
      bodyMessage ??= issue.message
      continue
    }
    const key = issue.path.join('.')
    if (!(key in fields)) {
      fields[key] = issue.message
    }
  }

  throw new ValidationError(fields, bodyMessage)
}