/** Corpo padrão de toda resposta de erro da API (ver "Formato de Erros da API" no design). */
export interface ErrorBody {
  error: string
  message: string
  fields?: Record<string, string>
  /** Só no 429: segundos até poder tentar de novo. */
  retryAfter?: number
}

/** Erro esperado, que vira uma resposta HTTP com status e corpo conhecidos. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = new.target.name
  }

  toBody(): ErrorBody {
    return {
      error: this.code,
      message: this.message,
      ...(this.fields ? { fields: this.fields } : {})
    }
  }
}

/** 400: payload inválido. `fields` mapeia cada campo inválido à sua mensagem. */
export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = 'Dados inválidos') {
    super(400, 'ValidationError', message, fields)
  }
}

/** 409: o recurso já existe (ex.: email já cadastrado). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'ConflictError', message)
  }
}

/** 401: credenciais incorretas, ou token ausente, inválido ou expirado. */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, 'UnauthorizedError', message)
  }
}

/** 404: o recurso pedido não existe (ex.: token válido de um usuário que foi apagado). */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(404, 'NotFound', message)
  }
}

/** 429: limite de requisições excedido. `retryAfter` em segundos (o mesmo valor do cabeçalho Retry-After). */
export class TooManyRequestsError extends AppError {
  constructor(
    message: string,
    readonly retryAfter: number
  ) {
    super(429, 'TooManyRequestsError', message)
  }

  override toBody(): ErrorBody {
    return { ...super.toBody(), retryAfter: this.retryAfter }
  }
}
