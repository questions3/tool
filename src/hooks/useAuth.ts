import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Авторизация агента по одноразовому коду (OTP) на email.
 *
 * Поток входа в два шага:
 *   1. `requestCode(email)` — проверяем, что email есть в белом списке
 *      (`public.is_agent_allowed` — доступна анонимам и возвращает только
 *      boolean, не раскрывая сам список), и просим Supabase прислать код
 *      на почту (`auth.signInWithOtp`).
 *   2. `verifyCode(email, token)` — сверяем введённый 6-значный код
 *      (`auth.verifyOtp`). При успехе Supabase открывает сессию, которую
 *      мы слушаем через `onAuthStateChange`.
 *
 * Сессия (JWT) хранится самим supabase-js в localStorage и
 * автоматически обновляется.
 *
 * ВНИМАНИЕ: реальная доставка письма с кодом требует настроенного
 * SMTP в Supabase → Authentication → Emails. Встроенный почтовик
 * Supabase шлёт только на адреса команды проекта и жёстко лимитирован.
 */

/** Причина отказа на шаге запроса/проверки кода. */
export type AuthFailure =
  | 'not_configured'
  | 'not_allowed'
  | 'send_failed'
  | 'invalid_code'

/** Результат шага запроса/проверки кода. */
export type AuthResult = { ok: true } | { ok: false; reason: AuthFailure }

export interface AuthState {
  /** true — обе env-переменные Supabase заданы (OTP-вход доступен). */
  configured: boolean
  /** true — пока восстанавливаем существующую сессию из хранилища. */
  loading: boolean
  /** Текущая сессия Supabase Auth или null. */
  session: Session | null
  /** Шаг 1: запросить код на email из белого списка. */
  requestCode: (email: string) => Promise<AuthResult>
  /** Шаг 2: проверить введённый код и открыть сессию. */
  verifyCode: (email: string, token: string) => Promise<AuthResult>
  /** Завершить сессию. */
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const configured = isSupabaseConfigured
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const requestCode = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, reason: 'not_configured' }
    const clean = email.trim()
    try {
      // 1. Email должен быть в белом списке агентов.
      const { data: allowed, error: rpcError } = await supabase.rpc(
        'is_agent_allowed',
        { p_email: clean },
      )
      if (rpcError) return { ok: false, reason: 'send_failed' }
      if (!allowed) return { ok: false, reason: 'not_allowed' }

      // 2. Просим Supabase отправить одноразовый код на почту.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: true },
      })
      if (otpError) return { ok: false, reason: 'send_failed' }

      return { ok: true }
    } catch {
      // Промис мог отклониться (сеть/ретраи) — не оставляем форму висеть.
      return { ok: false, reason: 'send_failed' }
    }
  }, [])

  const verifyCode = useCallback(
    async (email: string, token: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, reason: 'not_configured' }
      try {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email',
        })
        if (error) return { ok: false, reason: 'invalid_code' }
        return { ok: true }
      } catch {
        return { ok: false, reason: 'invalid_code' }
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return { configured, loading, session, requestCode, verifyCode, signOut }
}
