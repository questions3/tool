import { useEffect, useRef, useState } from 'react'

export interface ProfileItem {
  label: string
  onClick?: () => void
  href?: string
  icon?: React.ReactNode
  /** Выделить как опасное/завершающее действие (выход). */
  danger?: boolean
}

interface Props {
  /** Кто вошёл. Показывается в шапке меню. */
  email: string | null
  /** Подпись под адресом: роль или назначение аккаунта. */
  subtitle?: string
  items: ProfileItem[]
}

/**
 * Меню профиля.
 *
 * Собирает в одну точку всё, что раньше лежало кнопками в шапке: адрес
 * вошедшего, переходы и выход. На узком экране это принципиально —
 * кнопки не помещались и вытесняли переключатель языка.
 *
 * Закрывается по клику вне, по Esc и после выбора пункта.
 */
export function ProfileMenu({ email, subtitle, items }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initial = (email?.trim()[0] ?? '?').toUpperCase()

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={email ?? 'Профиль'}
        title={email ?? undefined}
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-200 ${
          open
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-line bg-white text-ink-2 hover:border-accent-line hover:text-accent'
        }`}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_40px_-12px_rgba(14,19,48,0.24)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">
              {email ?? '—'}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>
            )}
          </div>

          <ul className="py-1">
            {items.map((item, i) => (
              <li key={i}>
                {item.href ? (
                  <a
                    href={item.href}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-panel hover:text-ink"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                ) : (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      item.onClick?.()
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors duration-150 ${
                      item.danger
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-ink-2 hover:bg-panel hover:text-ink'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
