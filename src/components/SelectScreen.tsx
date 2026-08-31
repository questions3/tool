import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'
import { IconArrowRight, IconClose, IconSearch, IconStar } from './icons'

export interface SelectItem {
  id: string
  label: string
  hint: string
}

interface Props {
  lang: Lang
  title: string
  items: SelectItem[]
  onSelect: (id: string) => void
  columns?: 2 | 3
  /**
   * Показать строку поиска. Включается только там, где список длинный
   * (возражения) — для трёх этапов поиск был бы шумом.
   */
  searchable?: boolean
  /** Полоска фильтров под заголовком (чипы тегов). */
  filters?: React.ReactNode
  /** Избранное: если не передано, звёздочки не показываются. */
  isFavorite?: (id: string) => boolean
  onToggleFavorite?: (id: string) => void
}

/** Порог, с которого строка поиска действительно помогает. */
const SEARCH_MIN_ITEMS = 6

export function SelectScreen({
  lang,
  title,
  items,
  onSelect,
  columns = 2,
  searchable = false,
  filters,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const [query, setQuery] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)

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

  /*
   * Режим «в звонке»: во время разговора руки заняты, тянуться к мыши
   * некогда. Цифра открывает карточку по номеру, «/» ставит курсор в поиск.
   * Внутри полей ввода цифры не перехватываем — там человек печатает.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        !!el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)

      if (e.key === '/' && !typing && searchInput.current) {
        e.preventDefault()
        searchInput.current.focus()
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return

      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= 9 && shown[n - 1]) {
        e.preventDefault()
        onSelect(shown[n - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown, onSelect])

  return (
    <div className="fade-in">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
        {title}
      </h1>

      {filters}

      {showSearch && (
        <div className="relative mt-5">
          <IconSearch
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            ref={searchInput}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder', lang)}
            aria-label={t('searchPlaceholder', lang)}
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-10 pr-10 text-[15px] text-ink outline-none transition-colors duration-200 placeholder:text-ink-3 hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/12"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('searchClear', lang)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors duration-200 hover:bg-panel hover:text-ink"
            >
              <IconClose size={16} />
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-white px-4 py-10 text-center text-sm text-ink-3">
          {t('searchNoResults', lang)}
        </p>
      ) : (
        <>
          {showFavGroup && (
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              {t('favoritesGroup', lang)}
            </p>
          )}
          <div className={`mt-3 grid gap-3 ${grid}`}>
            {shown.map((item, idx) => (
              <div key={item.id} className="contents">
                {showFavGroup && idx === favCount && (
                  <div className="col-span-full mt-2 border-t border-line" />
                )}
                <Card
                  lang={lang}
                  item={item}
                  hotkey={idx < 9 ? idx + 1 : undefined}
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
  hotkey,
  onSelect,
  starred,
  onToggleStar,
}: {
  lang: Lang
  item: SelectItem
  /** Номер для клавиш 1–9; на узких экранах не показываем. */
  hotkey?: number
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
      className="card card-hover group flex min-h-[88px] cursor-pointer items-start gap-3.5 rounded-2xl border border-line bg-white p-4 text-left hover:border-accent-line focus:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 sm:p-5"
    >
      {hotkey && (
        <span
          aria-hidden
          className="mt-0.5 hidden h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line font-mono text-[11px] text-ink-3 transition-colors duration-200 group-hover:border-accent-line group-hover:bg-accent-soft group-hover:text-accent sm:flex"
        >
          {hotkey}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[1.0625rem] font-semibold leading-snug text-ink">
          {item.label}
        </span>
        {item.hint && (
          <span className="mt-1 text-sm leading-relaxed text-ink-3">
            {item.hint}
          </span>
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
            className={`-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-200 ${
              starred
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-line-strong hover:bg-panel hover:text-amber-500'
            }`}
          >
            <IconStar size={17} filled={starred} />
          </button>
        )}
        <IconArrowRight
          size={18}
          className="text-line-strong transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </span>
    </div>
  )
}
