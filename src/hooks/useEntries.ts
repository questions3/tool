import { useEffect, useState } from 'react'
import type { Entry, SectionId } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchEntries } from '../data/repository'

export interface EntriesState {
  loading: boolean
  error: boolean
  entries: Entry[]
}

/**
 * Загружает элементы раздела (презентации / сервисы / рынок) из Supabase.
 * Если Supabase не настроен — отдаёт пустой список (раздел будет пустым).
 */
export function useEntries(section: SectionId): EntriesState {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setEntries([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchEntries(section)
      .then((e) => !cancelled && setEntries(e))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [section])

  return { loading, error, entries }
}
