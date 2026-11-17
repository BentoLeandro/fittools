/** Corpo padrão de toda resposta de erro da API (ver "Formato de Erros da API" no design). */
export interface ErrorBody {
  error: string
  message: string
  fields?: Record<string, string>
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