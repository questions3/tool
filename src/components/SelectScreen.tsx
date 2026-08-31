import { useMemo, useState } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'

export interface SelectItem {
  id: string
  label: string
  hint: string
}

interface Props {
  lang: Lang
  stepLabel: string
  title: string
  items: SelectItem[]
  onSelect: (id: string) => void
  columns?: 2 | 3
  /**
   * Показать строку поиска. Включается только там, где список длинный
   * (возражения) — для трёх этапов поиск был бы шумом.
   */
  searchable?: boolean
  /** Избранное: если не передано, звёздочки не показываются. */
  isFavorite?: (id: string) => boolean
  onToggleFavorite?: (id: string) => void
}

/** Порог, с которого строка поиска действительно помогает. */
const SEARCH_MIN_ITEMS = 6

export function SelectScreen({
  lang,
  stepLabel,
  title,
  items,
  onSelect,
  columns = 2,
  searchable = false,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const [query, setQuery] = useState('')

  const grid =
    columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'

  const showSearch = searchable && items.length >= SEARCH_MIN_ITEMS
  const showStars = Boolean(isFavorite && onToggleFavorite)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.hint.toLowerCase().includes(q),
        )
      : items

    if (!isFavorite) return filtered
    // Избранное — наверх, относительный порядок внутри групп сохраняется.
    const fav = filtered.filter((i) => isFavorite(i.id))
    const rest = filtered.filter((i) => !isFavorite(i.id))
    return [...fav, ...rest]
  }, [items, query, isFavorite])

  // Индекс, с которого начинаются неизбранные — чтобы вставить разделитель.
  const favCount = isFavorite ? shown.filter((i) => isFavorite(i.id)).length : 0
  const showFavGroup = favCount > 0 && favCount < shown.length

  return (
    <div className="fade-in">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {stepLabel}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>

      {showSearch && (
        <div className="relative mt-5">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          >
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder', lang)}
            aria-label={t('searchPlaceholder', lang)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('searchClear', lang)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          {t('searchNoResults', lang)}
        </p>
      ) : (
        <>
          {showFavGroup && (
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t('favoritesGroup', lang)}
            </p>
          )}
          <div className={`mt-3 grid gap-3 ${grid}`}>
            {shown.map((item, idx) => (
              <div key={item.id} className="contents">
                {showFavGroup && idx === favCount && (
                  <div className="col-span-full mt-2 border-t border-slate-200" />
                )}
                <Card
                  lang={lang}
                  item={item}
                  onSelect={onSelect}
                  starred={showStars ? isFavorite!(item.id) : undefined}
                  onToggleStar={
                    showStars ? () => onToggleFavorite!(item.id) : undefined
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Карточка выбора. Это div, а не button: внутрь вложена вторая кнопка
 * (звёздочка), а кнопка внутри кнопки — невалидная разметка. Поэтому
 * клавиатурная доступность сделана руками (role/tabIndex/Enter/Space).
 */
function Card({
  lang,
  item,
  onSelect,
  starred,
  onToggleStar,
}: {
  lang: Lang
  item: SelectItem
  onSelect: (id: string) => void
  starred?: boolean
  onToggleStar?: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(item.id)
        }
      }}
      className="card card-hover group flex min-h-[88px] cursor-pointer items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-accent focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 sm:p-5"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-semibold leading-snug text-slate-900">
          {item.label}
        </span>
        {item.hint && (
          <span className="mt-1 text-sm text-slate-500">{item.hint}</span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-center gap-2">
        {onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar()
            }}
            aria-pressed={starred}
            aria-label={t(starred ? 'removeFavorite' : 'addFavorite', lang)}
            title={t(starred ? 'removeFavorite' : 'addFavorite', lang)}
            className={`-mr-1 -mt-1 rounded-md px-1.5 py-0.5 text-base leading-none transition ${
              starred
                ? 'text-amber-400 hover:text-amber-500'
                : 'text-slate-300 hover:text-amber-400'
            }`}
          >
            {starred ? '★' : '☆'}
          </button>
        )}
        <span
          aria-hidden
          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent"
        >
          →
        </span>
      </span>
    </div>
  )
}
