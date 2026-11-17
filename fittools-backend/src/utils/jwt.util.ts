import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import type { JWTPayload } from '../types'

const SECONDS_PER_DAY = 24 * 60 * 60

/** Erro base de token. Quem só precisa responder 401 captura esta classe. */
export class JwtError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** Token com assinatura válida, mas fora do prazo de validade. */
export class JwtExpiredError extends JwtError {
  constructor() {
    super('Token expirado')
  }
}

/** Token malformado, com assinatura ou algoritmo incorretos, ou com conteúdo inesperado. */
export class JwtInvalidError extends JwtError {
  constructor() {
    super('Token inválido')
  }
}

/**
 * Gera um JWT assinado com HS256 contendo `user_id`, `email`, `iat` e `exp`.
 * A validade vem de `JWT_EXPIRATION_DAYS` (padrão: 7 dias).
 *
 * @param userId - UUID do usuário
 * @param email - E-mail do usuário
 * @returns Token JWT assinado
 */
export function signJWT(userId: string, email: string): string {
  return jwt.sign({ user_id: userId, email }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRATION_DAYS * SECONDS_PER_DAY
  })
}

/**
 * Verifica a assinatura e o prazo do token e devolve o conteúdo.
 * Só aceita HS256: tokens com `alg: none` ou com outro algoritmo são rejeitados.
 *
 * @param token - Token JWT recebido do cliente
 * @throws {JwtExpiredError} se o token estiver expirado
 * @throws {JwtInvalidError} se o token for inválido por qualquer outro motivo
 */
export function verifyJWT(token: string): JWTPayload {
  let decoded: string | jwt.JwtPayload

  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch (error) {
    // TokenExpiredError herda de JsonWebTokenError, então precisa ser checado primeiro
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtExpiredError()
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtInvalidError()
    }
    // Qualquer outra falha é um bug nosso, não um token ruim: não esconder
    throw error
  }

  if (!isJWTPayload(decoded)) {
    throw new JwtInvalidError()
  }

  return decoded
}

function isJWTPayload(value: string | jwt.JwtPayload): value is JWTPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { user_id, email, iat, exp } = value as Record<string, unknown>

  return (
    typeof user_id === 'string' &&
    user_id.length > 0 &&
    typeof email === 'string' &&
    email.length > 0 &&
    typeof iat === 'number' &&
    typeof exp === 'number'
  )
}