import type { Lang } from '../types'

interface Props {
  lang: Lang
  onChange: (lang: Lang) => void
}

export function LangToggle({ lang, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-medium">
      {(['ru', 'pl'] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            lang === l
              ? 'bg-accent text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-pressed={lang === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
