import type { Lang, Language } from '../types'

interface Props {
  lang: Lang
  languages: Language[]
  onChange: (lang: Lang) => void
}

export function LangToggle({ lang, languages, onChange }: Props) {
  if (languages.length <= 1) return null

  // Много языков — компактный селект вместо ряда чипов (экономит место в шапке).
  if (languages.length > 3) {
    return (
      <select
        value={lang}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Язык"
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.code.toUpperCase()} · {l.name}
          </option>
        ))}
      </select>
    )
  }

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
