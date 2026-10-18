// Notificacoes (toast). Qualquer parte do site pode chamar, por exemplo:
//   const toast = useToast()
//   toast.success('Perfil atualizado com sucesso!')
// O componente <CommonToast /> (no layout padrao) e quem exibe a lista.

export type ToastType = 'success' | 'error' | 'info'

/** Motivos para segurar o aviso na tela: mouse em cima ou foco do teclado dentro dele. */
export type PauseReason = 'hover' | 'focus'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastTimer {
  handle: ReturnType<typeof setTimeout> | null
  /** Tempo que ainda falta, em ms, quando o contador esta parado. */
  remaining: number
  startedAt: number
  holders: Set<PauseReason>
}

/** Tempo na tela, em ms. Erros ficam mais tempo para dar chance de ler. */
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  error: 8000
}

/** Limite de avisos visiveis ao mesmo tempo; os mais antigos saem primeiro. */
const MAX_TOASTS = 4

// Os contadores ficam fora do estado reativo e so existem no navegador. Sao compartilhados
// por todas as chamadas de useToast(), porque o aviso nasce em uma pagina e e pausado no
// componente de avisos.
const timers = new Map<number, ToastTimer>()

function clearTimer(id: number) {
  const timer = timers.get(id)
  if (timer?.handle) clearTimeout(timer.handle)
  timers.delete(id)
}

export function useToast() {
  const toasts = useState<ToastItem[]>('toasts', () => [])
  const nextId = useState<number>('toast-next-id', () => 1)

  function dismiss(id: number) {
    clearTimer(id)
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function startTimer(id: number, ms: number) {
    clearTimer(id)
    timers.set(id, {
      handle: setTimeout(() => dismiss(id), ms),
      remaining: ms,
      startedAt: Date.now(),
      holders: new Set()
    })
  }

  /** Mostra um aviso e devolve o id. duration = 0 deixa o aviso fixo ate ser fechado. */
  function show(type: ToastType, message: string, duration: number = DEFAULT_DURATION[type]) {
    const id = nextId.value++
    const before = toasts.value
    const after = [...before, { id, type, message }].slice(-MAX_TOASTS)

    // Avisos descartados pelo limite nao podem deixar contadores soltos.
    for (const old of before) {
      if (!after.some((toast) => toast.id === old.id)) clearTimer(old.id)
    }
    toasts.value = after

    // Os avisos so nascem de acoes do usuario, no navegador; no build (SSG) nao ha timer.
    if (typeof window !== 'undefined' && duration > 0) startTimer(id, duration)
    return id
  }

  /**
   * Segura o aviso na tela (mouse em cima ou foco dentro dele). O tempo restante e guardado
   * e o aviso so some depois que todos os motivos forem liberados com resume().
   */
  function pause(id: number, reason: PauseReason = 'hover') {
    const timer = timers.get(id)
    if (!timer) return
    const alreadyHeld = timer.holders.size > 0
    timer.holders.add(reason)
    if (alreadyHeld || timer.handle === null) return

    clearTimeout(timer.handle)
    timer.handle = null
    timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt))
  }

  /** Libera um motivo; quando nao sobra nenhum, o contador continua de onde parou. */
  function resume(id: number, reason: PauseReason = 'hover') {
    const timer = timers.get(id)
    if (!timer) return
    timer.holders.delete(reason)
    if (timer.holders.size > 0 || timer.handle !== null) return

    timer.startedAt = Date.now()
    timer.handle = setTimeout(() => dismiss(id), timer.remaining)
  }

  return {
    toasts,
    show,
    success: (message: string, duration?: number) => show('success', message, duration),
    error: (message: string, duration?: number) => show('error', message, duration),
    info: (message: string, duration?: number) => show('info', message, duration),
    dismiss,
    pause,
    resume
  }
}