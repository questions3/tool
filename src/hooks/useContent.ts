import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language, Objection, Rebuttal, Stage } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
import { withTimeout } from '../lib/withTimeout'
import {
  fetchLanguages,
  fetchObjections,
  fetchRebuttal,
  fetchStages,
} from '../data/repository'
import {
  fallbackLanguages,
  getRebuttal as getStaticRebuttal,
  objections as staticObjections,
  stages as staticStages,
} from '../data/content'

/** Включённые записи, отсортированные по sortOrder. */
function enabled<T extends { isEnabled?: boolean; sortOrder?: number }>(
  list: T[],
): T[] {
  return list
    .filter((x) => x.isEnabled !== false)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export interface ContentState {
  loading: boolean
  error: string | null
  languages: Language[]
  objections: Objection[]
  stages: Stage[]
  /** Загрузить скрипт под пару (возражение × этап). */
  loadRebuttal: (objectionId: string, stageId: string) => Promise<Rebuttal | null>
  /** true — данные взяты из статического content.ts (Supabase не настроен). */
  usingFallback: boolean
}

/**
 * Загружает языки/возражения/этапы для приложения агента. Если Supabase не
 * настроен — отдаёт встроенный статический контент (офлайн-фолбэк).
 */
export function useContent(): ContentState {
  const usingFallback = !isSupabaseConfigured
  const [loading, setLoading] = useState(!usingFallback)
  const [error, setError] = useState<string | null>(null)
  const [languages, setLanguages] = useState<Language[]>(
    usingFallback ? enabled(fallbackLanguages) : [],
  )
  const [objections, setObjections] = useState<Objection[]>(
    usingFallback ? enabled(staticObjections) : [],
  )
  const [stages, setStages] = useState<Stage[]>(
    usingFallback ? enabled(staticStages) : [],
  )
  // Тик ручного/фонового перезапроса (фокус вкладки). 0 — первичная загрузка.
  const [reloadTick, setReloadTick] = useState(0)
  const lastFetch = useRef(0)

  useEffect(() => {
    if (usingFallback) return
    let cancelled = false
    const initial = reloadTick === 0
    // Фоновое обновление не показывает экран загрузки и не рушит контент
    // при ошибке — агент продолжает видеть прежние данные.
    if (initial) {
      setLoading(true)
      setError(null)
    }
    lastFetch.current = Date.now()
    withTimeout(Promise.all([fetchLanguages(), fetchObjections(), fetchStages()]))
      .then(([langs, objs, stgs]) => {
        if (cancelled) return
        setLanguages(enabled(langs))
        setObjections(enabled(objs))
        setStages(enabled(stgs))
        setError(null)
      })
      .catch((e) => {
        if (cancelled || !initial) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled && initial) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [usingFallback, reloadTick])

  // Возврат к вкладке → подтягиваем свежий контент (админ мог его изменить).
  // Троттлинг 20с, чтобы быстрый alt-tab не порождал шквал запросов.
  useEffect(() => {
    if (usingFallback) return
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
  }, [usingFallback])

  const loadRebuttal = useCallback(
    async (objectionId: string, stageId: string): Promise<Rebuttal | null> => {
      if (usingFallback) {
        return getStaticRebuttal(objectionId, stageId) ?? null
      }
      return fetchRebuttal(objectionId, stageId)
    },
    [usingFallback],
  )

  return {
    loading,
    error,
    languages,
    objections,
    stages,
    loadRebuttal,
    usingFallback,
  }
}
