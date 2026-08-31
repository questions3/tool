import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'
import { searchContent, type SearchHit } from '../data/repository'

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
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span aria-hidden className="text-slate-400">
            ⌕
          </span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchAll', lang)}
            aria-label={t('searchAll', lang)}
            className="min-w-0 flex-1 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            aria-label={t('cancel', lang)}
            className="rounded-md px-2 py-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {t('searchHint', lang)}
            </p>
          )}
          {query.trim().length >= 2 && loading && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {t('loading', lang)}
            </p>
          )}
          {error && (
            <p className="px-4 py-8 text-center text-sm text-red-600">
              {t('loadError', lang)}
            </p>
          )}
          {!loading && !error && query.trim().length >= 2 && hits.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {t('searchEmpty', lang)}
            </p>
          )}

          {hits.map((hit, i) => (
            <button
              key={i}
              onClick={() => onGo(hit)}
              className="flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
            >
              <span className="flex items-baseline gap-2">
                <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {t(KIND_KEY[hit.kind], lang)}
                </span>
                <span className="truncate font-medium text-slate-900">
                  {hit.title}
                </span>
              </span>
              {hit.snippet && (
                <span className="line-clamp-2 text-sm text-slate-500">
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
