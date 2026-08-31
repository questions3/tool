import { useEffect, useState } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'
import { fetchRecentChanges, type ChangeRow } from '../data/repository'

const KEY = 'convvy.lastSeen'
/** С какого момента считать «новым», если оператор здесь впервые. */
const FIRST_VISIT_DAYS = 7

interface Props {
  lang: Lang
  enabled: boolean
  onGo: (objectionId: string, stageId: string | null) => void
}

/**
 * Плашка «Что нового» на главной.
 *
 * Момент последнего визита хранится в браузере: это личная отметка, ради
 * которой не стоит заводить строку в базе. Плашка закрывается один раз —
 * отметка сдвигается, и до следующих правок она не возвращается.
 */
export function WhatsNew({ lang, enabled, onGo }: Props) {
  const [rows, setRows] = useState<ChangeRow[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchRecentChanges(readLastSeen(), lang)
      .then((r) => !cancelled && setRows(r))
      // Плашка необязательная: молчим и не мешаем работать.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [enabled, lang])

  if (hidden || rows.length === 0) return null

  function dismiss() {
    writeLastSeen()
    setHidden(true)
  }

  return (
    <div className="mb-6 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {t('whatsNew', lang)}
        </span>
        <button
          onClick={dismiss}
          className="rounded text-xs text-ink-3 underline underline-offset-2 transition hover:text-ink"
        >
          {t('dismiss', lang)}
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.slice(0, 5).map((r, i) => (
          <li key={i}>
            <button
              onClick={() => onGo(r.objectionId, r.stageId)}
              className="flex flex-wrap items-baseline gap-2 text-left text-sm text-ink underline-offset-2 hover:underline"
            >
              <span className="font-medium">{r.title}</span>
              <span className="text-xs text-ink-3">
                {r.isNew ? t('whatsNewAdded', lang) : t('whatsNewUpdated', lang)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {rows.length > 5 && (
        <p className="mt-1.5 text-xs text-ink-3">+{rows.length - 5}</p>
      )}
    </div>
  )
}

function readLastSeen(): string {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return raw
  } catch {
    // Приватный режим — считаем визит первым.
  }
  const since = new Date()
  since.setDate(since.getDate() - FIRST_VISIT_DAYS)
  return since.toISOString()
}

function writeLastSeen() {
  try {
    localStorage.setItem(KEY, new Date().toISOString())
  } catch {
    // Не критично: плашка просто покажется снова.
  }
}
