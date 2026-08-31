import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'
import { searchContent, type SearchHit } from '../data/repository'
import { IconClose, IconSearch } from './icons'

interface Props {
  lang: Lang
  onClose: () => void
  onGo: (hit: SearchHit) => void
}

/** Пауза перед запросом: оператор печатает, а не ждёт после каждой буквы. */
const DEBOUNCE_MS = 250

const KIND_KEY = {
  objection: 'searchKindObjection',
  script: 'searchKindScript',
  branch: 'searchKindBranch',
  entry: 'searchKindEntry',
} as const

/**
 * Сквозной поиск по всему контенту.
 *
 * Ищет база, а не браузер: выгружать весь контент ради подстроки долго и
 * лишний раз отдаёт наружу то, что оператору знать не обязательно.
 */
export function SearchOverlay({ lang, onClose, onGo }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      searchContent(q, lang)
        .then((r) => !cancelled && (setHits(r), setError(false)))
        .catch(() => !cancelled && setError(true))
        .finally(() => !cancelled && setLoading(false))
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, lang])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-12px_rgba(14,19,48,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <IconSearch size={18} className="shrink-0 text-ink-3" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchAll', lang)}
            aria-label={t('searchAll', lang)}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <button
            onClick={onClose}
            aria-label={t('cancel', lang)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors duration-200 hover:bg-panel hover:text-ink"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="px-4 py-10 text-center text-sm text-ink-3">
              {t('searchHint', lang)}
            </p>
          )}
          {query.trim().length >= 2 && loading && (
            <p className="px-4 py-10 text-center text-sm text-ink-3">
              {t('loading', lang)}
            </p>
          )}
          {error && (
            <p className="px-4 py-8 text-center text-sm text-red-600">
              {t('loadError', lang)}
            </p>
          )}
          {!loading && !error && query.trim().length >= 2 && hits.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-ink-3">
              {t('searchEmpty', lang)}
            </p>
          )}

          {hits.map((hit, i) => (
            <button
              key={i}
              onClick={() => onGo(hit)}
              className="flex w-full flex-col gap-1 border-b border-line px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-panel"
            >
              <span className="flex items-baseline gap-2">
                <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {t(KIND_KEY[hit.kind], lang)}
                </span>
                <span className="truncate font-medium text-ink">
                  {hit.title}
                </span>
              </span>
              {hit.snippet && (
                <span className="line-clamp-2 text-sm text-ink-3">
                  {hit.snippet}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
