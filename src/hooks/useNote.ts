import { useCallback, useEffect, useState } from 'react'
import { fetchNote, saveNote } from '../data/repository'

interface Ctx {
  agentEmail: string | null
  objectionId: string
  stageId: string
  /** Выключено, когда нет базы или оператор не вошёл. */
  enabled: boolean
}

/**
 * Личная заметка оператора к паре «возражение × этап».
 *
 * Хранится в базе, а не в браузере: оператор работает с разных машин, и
 * своя наработка по возражению должна ехать с ним. Видна только автору —
 * это гарантирует RLS, а не клиент.
 */
export function useNote({ agentEmail, objectionId, stageId, enabled }: Ctx) {
  const [body, setBody] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const on = enabled && !!agentEmail

  useEffect(() => {
    if (!on) {
      setLoaded(true)
      return
    }
    let cancelled = false
    setLoaded(false)
    setError(false)
    fetchNote(agentEmail, objectionId, stageId)
      .then((v) => !cancelled && setBody(v))
      // Заметка — не главное на экране: сбой чтения не должен мешать
      // оператору работать со скриптом.
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [on, agentEmail, objectionId, stageId])

  const save = useCallback(
    async (text: string) => {
      if (!on) return
      setSaving(true)
      setError(false)
      try {
        await saveNote({ agentEmail, objectionId, stageId, body: text })
        setBody(text.trim())
      } catch {
        setError(true)
      } finally {
        setSaving(false)
      }
    },
    [on, agentEmail, objectionId, stageId],
  )

  return { body, loaded, saving, error, save, available: on }
}
