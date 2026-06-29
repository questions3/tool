import type { Lang, Language } from '../types'

interface Props {
  lang: Lang
  languages: Language[]
  onChange: (lang: Lang) => void
}

export function LangToggle({ lang, languages, onChange }: Props) {
  if (languages.length <= 1) return null
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-medium">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          title={l.name}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            lang === l.code
              ? 'bg-accent text-white'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-pressed={lang === l.code}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
