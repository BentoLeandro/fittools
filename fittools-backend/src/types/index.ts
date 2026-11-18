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

/** Usuário autenticado pelo middleware JWT (`request.user`). */
export interface AuthenticatedUser {
  id: string
  email: string
}
