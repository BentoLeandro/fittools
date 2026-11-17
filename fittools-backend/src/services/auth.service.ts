import bcrypt from 'bcrypt'

/** Custo do bcrypt: 2^12 = 4096 rodadas (cerca de 300 ms por operação). */
export const BCRYPT_COST_FACTOR = 12

/**
 * O bcrypt só usa os primeiros 72 BYTES da senha e ignora o resto sem avisar
 * (medido: "a"×72 + "X" e "a"×72 + "Y" geram o mesmo hash). Para não aceitar
 * duas senhas diferentes como se fossem iguais, o serviço recusa senhas maiores.
 */
export const MAX_PASSWORD_BYTES = 72

/** Senha com mais de 72 bytes em UTF-8 (letras acentuadas e emojis ocupam mais de 1 byte). */
export class PasswordTooLongError extends Error {
  constructor() {
    super(`A senha excede o limite de ${MAX_PASSWORD_BYTES} bytes`)
    this.name = 'PasswordTooLongError'
  }
}

function exceedsBcryptLimit(password: string): boolean {
  return Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
}

/**
 * Hash bcrypt (cost 12) de uma senha aleatória que ninguém conhece. No login, quando o email
 * não existe, a senha é conferida contra ele só para gastar o mesmo tempo (~300 ms) de um
 * email que existe; sem isso, a resposta rápida revelaria quais emails têm conta.
 * Se o `BCRYPT_COST_FACTOR` mudar, gerar outro hash (um teste confere o custo).
 */
export const DUMMY_PASSWORD_HASH = '$2b$12$HmJwzzmK2vxS7UynMBeHMO68TRsFAxssUkMdV7GpiDdGKbv97q/K2'

export class AuthService {
  /**
   * Gera o hash bcrypt (cost 12, com salt aleatório) de uma senha.
   * A mesma senha gera hashes diferentes a cada chamada.
   *
   * @throws {PasswordTooLongError} se a senha tiver mais de 72 bytes em UTF-8
   */
  async hashPassword(password: string): Promise<string> {
    if (exceedsBcryptLimit(password)) {
      throw new PasswordTooLongError()
    }
    return bcrypt.hash(password, BCRYPT_COST_FACTOR)
  }

  /**
   * Confere uma senha contra um hash bcrypt. Devolve `false` (nunca lança) para senha
   * errada, hash malformado ou senha acima de 72 bytes, que não pode ser igual à original.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (exceedsBcryptLimit(password)) {
      return false
    }
    return bcrypt.compare(password, hash)
  }
}

export const authService = new AuthService()