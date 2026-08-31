import { useCallback, useEffect, useState } from 'react'
import { fetchMyVote, saveVote, sendSuggestion, type Vote } from '../data/repository'

interface Ctx {
  agentEmail: string | null
  objectionId: string
  stageId: string
  lang: string
  /** Выключено, когда нет базы или оператор не вошёл. */
  enabled: boolean
}

/**
 * Оценка скрипта оператором: голос и предложение правки.
 *
 * Голос один на оператора и переголосовывается — это его мнение, а не
 * журнал. Предложение правки, наоборот, неизменяемо: админ разбирает
 * присланное и меняет только статус.
 */
export function useFeedback({
  agentEmail,
  objectionId,
  stageId,
  lang,
  enabled,
}: Ctx) {
  const [vote, setVote] = useState<Vote | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const on = enabled && !!agentEmail

  useEffect(() => {
    if (!on) return
    let cancelled = false
    setVote(null)
    setSent(false)
    fetchMyVote(agentEmail, objectionId, stageId, lang)
      .then((v) => !cancelled && setVote(v))
      // Оценка — не главное на экране: сбой чтения не мешает работать.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [on, agentEmail, objectionId, stageId, lang])

  const toggle = useCallback(
    async (next: Vote) => {
      if (!on) return
      // Повторное нажатие по тому же пальцу снимает голос.
      const value = vote === next ? null : next
      setVote(value)
      setBusy(true)
      try {
        await saveVote({ agentEmail, objectionId, stageId, lang, vote: value })
      } catch {
        setVote(vote) // не получилось — возвращаем как было
      } finally {
        setBusy(false)
      }
    },
    [on, vote, agentEmail, objectionId, stageId, lang],
  )

  const suggest = useCallback(
    async (body: string) => {
      if (!on) return
      setBusy(true)
      try {
        await sendSuggestion({ agentEmail, objectionId, stageId, lang, body })
        setSent(true)
      } catch {
        // Молча: текст остаётся в поле, оператор может отправить снова.
      } finally {
        setBusy(false)
      }
    },
    [on, agentEmail, objectionId, stageId, lang],
  )

  return { vote, sent, busy, toggle, suggest, available: on }
}
