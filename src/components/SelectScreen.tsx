import type { Lang } from '../types'

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
}

export function SelectScreen({
  stepLabel,
  title,
  items,
  onSelect,
  columns = 2,
}: Props) {
  const grid =
    columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="fade-in">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {stepLabel}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>

      <div className={`mt-6 grid gap-3 ${grid}`}>
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="card card-hover group flex min-h-[96px] items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-accent sm:p-5"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500 transition group-hover:bg-accent-soft group-hover:text-accent">
              {i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-lg font-semibold leading-snug text-slate-900">
                {item.label}
              </span>
              <span className="mt-1 text-sm text-slate-500">{item.hint}</span>
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
