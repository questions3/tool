import type { Localized } from '../../types'

interface Props {
  label: string
  value: Localized
  /** Активный язык заполнения — показывается одно поле под него. */
  lang: string
  /** Название языка для подписи (необязательно). */
  langName?: string
  onChange: (next: Localized) => void
  multiline?: boolean
  placeholder?: string
}

/**
 * Поле ввода локализованного значения для ОДНОГО активного языка.
 * Правка не затрагивает остальные языки — они сохраняются в JSONB.
 * Язык выбирается общим переключателем в шапке админки.
 */
export function LocalizedInput({
  label,
  value,
  lang,
  langName,
  onChange,
  multiline = false,
  placeholder,
}: Props) {
  const text = value[lang] ?? ''

  function set(next: string) {
    onChange({ ...value, [lang]: next })
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label} ·{' '}
        <span className="text-accent">
          {lang.toUpperCase()}
          {langName ? ` · ${langName}` : ''}
        </span>
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={text}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      ) : (
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      )}
    </label>
  )
}
