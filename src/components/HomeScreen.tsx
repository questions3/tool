import type { Lang } from '../types'
import { t, type UiKey } from '../i18n/ui'

/** Какой раздел выбрал агент на главной. */
export type HomeChoice = 'objections' | 'presentation' | 'service' | 'market'

const TILES: {
  key: HomeChoice
  label: UiKey
  hint: UiKey
  icon: string
}[] = [
  { key: 'objections', label: 'navObjections', hint: 'hintObjections', icon: '🛡️' },
  { key: 'presentation', label: 'navPresentations', hint: 'hintPresentations', icon: '📊' },
  { key: 'service', label: 'navServices', hint: 'hintServices', icon: '🧰' },
  { key: 'market', label: 'navMarket', hint: 'hintMarket', icon: '📈' },
]

export function HomeScreen({
  lang,
  onSelect,
}: {
  lang: Lang
  onSelect: (choice: HomeChoice) => void
}) {
  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {t('homeTitle', lang)}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            onClick={() => onSelect(tile.key)}
            className="card card-hover group flex min-h-[104px] items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-accent"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-2xl">
              {tile.icon}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-lg font-semibold leading-snug text-slate-900">
                {t(tile.label, lang)}
              </span>
              <span className="mt-1 text-sm text-slate-500">
                {t(tile.hint, lang)}
              </span>
            </span>
            <span
              aria-hidden
              className="mt-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent"
            >
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
