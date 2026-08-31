import { useEffect, useState } from 'react'
import { fetchObjectionTags, fetchTags, type Tag } from '../data/repository'
import { isSupabaseConfigured } from '../lib/supabase'

/**
 * Теги возражений и их привязки.
 *
 * Грузятся отдельно от основного контента и молча выключаются при сбое:
 * фильтр — удобство, а не условие работы. Нет тегов — нет и полоски чипов.
 */
export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [links, setLinks] = useState<{ objectionId: string; tagId: string }[]>([])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    Promise.all([fetchTags(), fetchObjectionTags()])
      .then(([t, l]) => {
        if (cancelled) return
        setTags(t)
        setLinks(l)
      })
      .catch(() => {
        // Фильтр просто не появится — экран остаётся рабочим.
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** id возражений, помеченных тегом. */
  function objectionsWithTag(tagId: string): Set<string> {
    return new Set(links.filter((l) => l.tagId === tagId).map((l) => l.objectionId))
  }

  return { tags, links, objectionsWithTag }
}
