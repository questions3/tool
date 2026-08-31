import type { Lang } from '../types'
import { t, type UiKey } from '../i18n/ui'
import {
  IconArrowRight,
  IconNote,
  IconSparkle,
  IconTarget,
} from './icons'

/** Какой раздел выбрал агент на главной. */
export type HomeChoice = 'objections' | 'presentation' | 'service' | 'market'

/** Иконки рисованные: эмодзи меняли начертание от системы к системе. */
const TILES: {
  key: HomeChoice
  label: UiKey
  hint: UiKey
  Icon: (p: { size?: number; className?: string }) => React.ReactElement
}[] = [
  { key: 'objections', label: 'navObjections', hint: 'hintObjections', Icon: IconTarget },
  { key: 'presentation', label: 'navPresentations', hint: 'hintPresentations', Icon: IconSparkle },
  { key: 'service', label: 'navServices', hint: 'hintServices', Icon: IconNote },
  { key: 'market', label: 'navMarket', hint: 'hintMarket', Icon: IconTrend },
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
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
        {t('homeTitle', lang)}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            onClick={() => onSelect(tile.key)}
            className="card card-hover group flex min-h-[104px] items-start gap-4 rounded-2xl border border-line bg-white p-5 text-left hover:border-accent-line"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white">
              <tile.Icon size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[1.0625rem] font-semibold leading-snug text-ink">
                {t(tile.label, lang)}
              </span>
              <span className="mt-1 text-sm leading-relaxed text-ink-3">
                {t(tile.hint, lang)}
              </span>
            </span>
            <IconArrowRight
              size={18}
              className="mt-1 shrink-0 text-line-strong transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Рынок: восходящая ломаная. Локальная — больше нигде не нужна. */
function IconTrend({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 13.5 8 9l3 3 5-5.5" />
      <path d="M12.5 6.5h4v4" />
    </svg>
  )
}
