import { useEffect, useRef, useState } from 'react'
import type { Entry, SectionId } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { withTimeout } from '../lib/withTimeout'
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
  // Тик фонового перезапроса (фокус вкладки). 0 — первичная загрузка.
  const [reloadTick, setReloadTick] = useState(0)
  const lastFetch = useRef(0)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setEntries([])
      setLoading(false)
      return
    }
    let cancelled = false
    const initial = reloadTick === 0
    // Фоновое обновление не мигает экраном загрузки и не рушит список
    // при ошибке — агент продолжает видеть прежние элементы.
    if (initial) {
      setLoading(true)
      setError(false)
    }
    lastFetch.current = Date.now()
    withTimeout(fetchEntries(section))
      .then((e) => !cancelled && setEntries(e))
      .catch(() => {
        if (!cancelled && initial) setError(true)
      })
      .finally(() => {
        if (!cancelled && initial) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [section, reloadTick])

  // Возврат к вкладке → подтягиваем свежий список (троттлинг 20с).
  useEffect(() => {
    if (!isSupabaseConfigured) return
    function refresh() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetch.current < 20000) return
      setReloadTick((n) => n + 1)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return { loading, error, entries }
}
