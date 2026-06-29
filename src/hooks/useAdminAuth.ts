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
  const { data } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
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

    async function apply(next: Session | null) {
      if (cancelled) return
      setSession(next)
      setIsAdmin(next ? await checkIsAdmin(next.user.id) : false)
      if (!cancelled) setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))
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
