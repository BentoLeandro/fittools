import { Prisma, type ActivityLevel, type FitnessGoal, type Sex } from '@prisma/client'
import { prisma } from '../database/client'
import type { HealthProfileInput } from '../schemas/user.schema'

/** Perfil de saúde como a API o devolve (números de verdade, sem `user_id`). */
export interface HealthProfileDto {
  id: string
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  sex: Sex | null
  activity_level: ActivityLevel | null
  fitness_goal: FitnessGoal | null
  updated_at: Date
}

export interface HealthProfileWithOwnerDto extends HealthProfileDto {
  user_id: string
}

export interface UserDto {
  id: string
  email: string
  name: string
  created_at: Date
  updated_at: Date
}

export interface MeDto {
  user: UserDto
  health_profile: HealthProfileDto | null
}

// `select` explícito: o `password_hash` nem sai do banco
const HEALTH_PROFILE_SELECT = {
  id: true,
  weight_kg: true,
  height_cm: true,
  age: true,
  sex: true,
  activity_level: true,
  fitness_goal: true,
  updated_at: true
} satisfies Prisma.UserHealthProfileSelect

// No PUT a resposta também traz o dono do perfil (como no exemplo do design)
const HEALTH_PROFILE_WITH_OWNER_SELECT = { ...HEALTH_PROFILE_SELECT, user_id: true } satisfies Prisma.UserHealthProfileSelect

const USER_WITH_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  created_at: true,
  updated_at: true,
  health_profile: { select: HEALTH_PROFILE_SELECT }
} satisfies Prisma.UserSelect

// A coluna id é UUID: um id em outro formato faria o Prisma lançar erro (500) em vez de "não achou"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type HealthProfileRow = Prisma.UserHealthProfileGetPayload<{ select: typeof HEALTH_PROFILE_SELECT }>

/**
 * O Prisma devolve colunas DECIMAL como `Decimal`, que o JSON escreve como TEXTO ("82.5").
 * O contrato da API (e o frontend) espera número.
 */
export function toHealthProfileDto<T extends HealthProfileRow>(
  row: T
): Omit<T, 'weight_kg' | 'height_cm'> & { weight_kg: number | null; height_cm: number | null } {
  return {
    ...row,
    weight_kg: row.weight_kg === null ? null : row.weight_kg.toNumber(),
    height_cm: row.height_cm === null ? null : row.height_cm.toNumber()
  }
}

export class UserService {
  /** Usuário e perfil de saúde numa única consulta. `null` se o usuário não existe mais. */
  async getMe(userId: string): Promise<MeDto | null> {
    if (!UUID_PATTERN.test(userId)) {
      return null
    }
    const row = await prisma.user.findUnique({ where: { id: userId }, select: USER_WITH_PROFILE_SELECT })
    if (!row) {
      return null
    }
    const { health_profile, ...user } = row
    return { user, health_profile: health_profile ? toHealthProfileDto(health_profile) : null }
  }
  /**
   * Cria ou SUBSTITUI o perfil de saúde do usuário (Requisito 5.6): todos os seis campos são
   * gravados, e o que não veio (ausente ou `null`) vira `null`. Um único `upsert` (atômico no
   * banco, graças ao `user_id` único): duas chamadas simultâneas nunca criam dois perfis.
   * Devolve `null` se o usuário não existe mais.
   */
  async replaceHealthProfile(userId: string, input: HealthProfileInput): Promise<HealthProfileWithOwnerDto | null> {
    if (!UUID_PATTERN.test(userId)) {
      return null
    }

    const values = {
      weight_kg: input.weight_kg ?? null,
      height_cm: input.height_cm ?? null,
      age: input.age ?? null,
      sex: input.sex ?? null,
      activity_level: input.activity_level ?? null,
      fitness_goal: input.fitness_goal ?? null
    }

    try {
      const row = await prisma.userHealthProfile.upsert({
        where: { user_id: userId },
        update: values,
        create: { user_id: userId, ...values },
        select: HEALTH_PROFILE_WITH_OWNER_SELECT
      })
      return toHealthProfileDto(row)
    } catch (error) {
      // P2003: violação de chave estrangeira. O token ainda vale, mas o usuário foi apagado
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return null
      }
      throw error
    }
  }
}

export const userService = new UserService()