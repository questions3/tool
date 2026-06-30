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
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return false
    return Boolean(data)
  } catch {
    // Сетевой сбой/таймаут не должен подвесить экран загрузки.
    return false
  }
}

export function useAdminAuth(): AdminAuthState {
  const configured = isSupabaseConfigured
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    // Монотонный токен: при быстрой смене сессий (onAuthStateChange может
    // сработать несколько раз подряд) асинхронный checkIsAdmin старого вызова
    // мог разрешиться ПОЗЖЕ нового и записать устаревший isAdmin. Применяем
    // результат только если это всё ещё самый свежий apply().
    let token = 0

    async function apply(next: Session | null) {
      if (cancelled) return
      const my = ++token
      try {
        const admin = next ? await checkIsAdmin(next.user.id) : false
        if (cancelled || my !== token) return
        setSession(next)
        setIsAdmin(admin)
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
    isAdmin,
    error,
    signIn,
    signOut,
  }
}
