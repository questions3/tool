import { IconCheck } from './icons'

interface Crumb {
  /** Готовая подпись шага (уже локализованная). */
  label: string
  /** Переход на этот шаг (доступен только для пройденных шагов). */
  onClick?: () => void
}

interface Props {
  /** Номер активного шага (1-based). */
  active: number
  crumbs: Crumb[]
}

/**
 * Универсальные «хлебные крошки»-шаги. Используются и в потоке возражений
 * (Возражение › Этап › Ответ), и в разделах (Раздел › Элемент).
 */
export function Stepper({ active, crumbs }: Props) {
  return (
    <nav
      aria-label="progress"
      className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm"
    >
      {crumbs.map((c, i) => {
        const step = i + 1
        const isActive = step === active
        const done = step < active
        const clickable = done && Boolean(c.onClick)
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg
                aria-hidden
                width="14" height="14" viewBox="0 0 20 20" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeLinejoin="round" className="text-line-strong"
              >
                <path d="m8 5 5 5-5 5" />
              </svg>
            )}
            <button
              disabled={!clickable}
              onClick={c.onClick}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-2 py-1 transition ${
                isActive
                  ? 'text-ink'
                  : clickable
                    ? 'text-ink-3 hover:bg-panel hover:text-ink'
                    : 'cursor-default text-ink-3/70'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200 ${
                  isActive
                    ? 'brand-fill text-white'
                    : done
                      ? 'bg-accent-soft text-accent'
                      : 'border border-line-strong text-ink-3'
                }`}
              >
                {done ? <IconCheck size={12} /> : step}
              </span>
              <span className="whitespace-nowrap font-medium">{c.label}</span>
            </button>
          </span>
        )
      })}
    </nav>
  )
}
