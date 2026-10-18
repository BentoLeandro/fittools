// Regras puras do guarda de rotas (Task 5.6). Sem Nuxt/Pinia para serem testaveis.

/** Pagina para onde o visitante nao autenticado e enviado. */
export const LOGIN_PATH = '/login'

type StorageReader = Pick<Storage, 'getItem'>

/**
 * Indica se ha token salvo no localStorage. O store so le o localStorage depois da montagem
 * (initOnMounted, para nao quebrar a hidratacao), entao num carregamento direto de /perfil
 * ele ainda esta vazio quando o middleware roda. O localStorage e a fonte da verdade.
 * Acesso bloqueado (modo privado, politica do navegador) conta como "sem token".
 */
export function hasStoredToken(storage: StorageReader | undefined, key: string): boolean {
  try {
    return !!storage?.getItem(key)
  } catch {
    return false
  }
}

/** Destino do redirecionamento ao login, preservando a rota original (com query e hash). */
export function buildLoginRedirect(to: { fullPath: string }) {
  return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
}