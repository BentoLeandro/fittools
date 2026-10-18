// Tipos da API REST do FitTools (espelham os contratos do backend em /api/v1).

export type Sex = 'male' | 'female'

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active'

export type FitnessGoal =
  | 'weight_loss'
  | 'maintenance'
  | 'muscle_gain'
  | 'athletic_performance'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
  updated_at?: string
}

/** Perfil de saude salvo no servidor. Todos os campos podem ser nulos (perfil parcial). */
export interface HealthProfile {
  id: string
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  sex: Sex | null
  activity_level: ActivityLevel | null
  fitness_goal: FitnessGoal | null
  updated_at: string
}

/** Dados enviados ao salvar o perfil (PUT /api/v1/users/me/profile). */
export interface HealthProfileInput {
  weight_kg?: number
  height_cm?: number
  age?: number
  sex?: Sex
  activity_level?: ActivityLevel
  fitness_goal?: FitnessGoal
}

/** Corpo de POST /api/v1/auth/login. */
export interface LoginPayload {
  email: string
  password: string
}

/** Corpo de POST /api/v1/auth/register. */
export interface RegisterPayload {
  email: string
  password: string
  name: string
}

/** Resposta de POST /api/v1/auth/register e POST /api/v1/auth/login. */
export interface AuthResponse {
  user: User
  token: string
}

/** Resposta de GET /api/v1/users/me. */
export interface MeResponse {
  user: User
  health_profile: HealthProfile | null
}

/** Resposta de PUT /api/v1/users/me/profile. */
export interface UpdateProfileResponse {
  health_profile: HealthProfile
}

/** Corpo padrao de erro devolvido pela API. */
export interface ApiErrorBody {
  error: string
  message: string
  /** Mensagens por campo, presentes nos erros de validacao (400). */
  fields?: Record<string, string>
}