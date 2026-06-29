import type { Lang } from '../types'
import { t } from '../i18n/ui'

interface Crumb {
  key: 'stepperObjection' | 'stepperStage' | 'stepperAnswer'
  value?: string
  onClick?: () => void
}

interface Props {
  lang: Lang
  active: 1 | 2 | 3
  crumbs: Crumb[]
}

export function Stepper({ lang, active, crumbs }: Props) {
  return (
    <nav
      aria-label="progress"
      className="mb-7 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm"
    >
      {crumbs.map((c, i) => {
        const step = (i + 1) as 1 | 2 | 3
        const isActive = step === active
        const done = step < active
        const clickable = done && Boolean(c.onClick)
        return (
          <span key={c.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-slate-300">
                ›
              </span>
            )}
            <button
              disabled={!clickable}
              onClick={c.onClick}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full px-2 py-1 transition ${
                isActive
                  ? 'text-slate-900'
                  : clickable
                    ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    : 'cursor-default text-slate-400'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-accent text-white'
                    : done
                      ? 'bg-accent-soft text-accent'
                      : 'border border-slate-300 text-slate-400'
                }`}
              >
                {done ? '✓' : step}
              </span>
              <span className="whitespace-nowrap font-medium">
                {c.value ?? t(c.key, lang)}
              </span>
            </button>
          </span>
        )
      })}
    </nav>
  )
}
