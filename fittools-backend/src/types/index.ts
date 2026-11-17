/**
 * Conteúdo (claims) do token JWT emitido pela API.
 * `iat` e `exp` são timestamps Unix em segundos, preenchidos na assinatura.
 */
export interface JWTPayload {
  user_id: string
  email: string
  iat: number
  exp: number
}