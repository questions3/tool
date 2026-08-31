import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Авторизация администратора через Supabase Auth (email + пароль).
 *
 * Помимо самой сессии проверяет, есть ли пользователь в таблице `admins`
 * (через RLS «admin read self»). Только админ может писать контент —
 * это дополнительно enforced политиками `is_admin()` на стороне БД.
 */

export interface AdminAuthState {
  configured: boolean
  loading: boolean
  session: Session | null
  isAdmin: boolean
  /** Роль в админке: полный доступ, только отчёты или ничего. */
  role: AdminRole | null
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

/**
 * Роль в админке. `admin` — полный доступ, `supervisor` — только отчёты,
 * null — доступа нет. Настоящий запрет живёт в политиках БД; здесь роль
 * нужна лишь чтобы не показывать вкладки, которые всё равно откажут.
 */
export type AdminRole = 'admin' | 'supervisor'

async function fetchRole(userId: string): Promise<AdminRole | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return null
    const role = (data as { role?: string } | null)?.role
    return role === 'admin' || role === 'supervisor' ? role : null
  } catch {
    // Сетевой сбой/таймаут не должен подвесить экран загрузки.
    return null
  }
}

export function useAdminAuth(): AdminAuthState {
  const configured = isSupabaseConfigured
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<AdminRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    // Монотонный токен: при быстрой смене сессий (onAuthStateChange может
    // сработать несколько раз подряд) асинхронный fetchRole старого вызова
    // мог разрешиться ПОЗЖЕ нового и записать устаревшую роль. Применяем
    // результат только если это всё ещё самый свежий apply().
    let token = 0

    async function apply(next: Session | null) {
      if (cancelled) return
      const my = ++token
      try {
        const next_role = next ? await fetchRole(next.user.id) : null
        if (cancelled || my !== token) return
        setSession(next)
        setRole(next_role)
      } finally {
        if (!cancelled && my === token) setLoading(false)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void apply(s)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!supabase) return false
      setError(null)
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) {
        setError(err.message)
        return false
      }
      return true
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return {
    configured,
    loading,
    session,
    isAdmin: role !== null,
    role,
    error,
    signIn,
    signOut,
  }
}
