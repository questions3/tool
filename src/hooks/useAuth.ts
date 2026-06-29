import { useCallback, useEffect, useState } from 'react'

/**
 * Авторизация по единому паролю для всех агентов.
 *
 * Актуальный пароль задаётся переменной окружения `VITE_APP_PASSWORD`
 * (в Vercel → Project → Settings → Environment Variables). Если она не
 * задана — используется пароль по умолчанию `DEFAULT_PASSWORD`.
 *
 * ВНИМАНИЕ: это статический SPA, поэтому пароль попадает в собранный
 * бандл и виден тому, кто откроет исходники страницы. Этого достаточно
 * как «калитка» для внутреннего инструмента, но это не защита секретов.
 * Для серверной проверки пароль нужно выносить в Vercel Function.
 */

const SESSION_KEY = 'convvy.session'

/** Пароль по умолчанию — действует, пока в окружении не задан свой. */
export const DEFAULT_PASSWORD = '000000'

/** Пароль из окружения (если задан и непустой) или дефолтный. */
const ENV_PASSWORD = (import.meta.env.VITE_APP_PASSWORD ?? '').trim()
const APP_PASSWORD = ENV_PASSWORD || DEFAULT_PASSWORD

/** true — если используется пароль по умолчанию (env-переменная не задана). */
export const usingDefaultPassword = ENV_PASSWORD.length === 0

export interface Session {
  loggedInAt: number
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [session])

  /** Проверить пароль и открыть сессию. Возвращает true при успехе. */
  const login = useCallback((password: string): boolean => {
    if (password.trim() !== APP_PASSWORD) return false
    setSession({ loggedInAt: Date.now() })
    return true
  }, [])

  const logout = useCallback(() => setSession(null), [])

  return { session, login, logout, usingDefaultPassword }
}
