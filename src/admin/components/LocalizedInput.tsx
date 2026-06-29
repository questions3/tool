import type { Language, Localized } from '../../types'

interface Props {
  label: string
  value: Localized
  languages: Language[]
  onChange: (next: Localized) => void
  multiline?: boolean
  placeholder?: string
}

/**
 * Группа полей ввода для локализованного значения — по одному полю на язык.
 * Список языков задаётся динамически (таблица `languages`).
 */
export function LocalizedInput({
  label,
  value,
  languages,
  onChange,
  multiline = false,
  placeholder,
}: Props) {
  function set(code: string, text: string) {
    onChange({ ...value, [code]: text })
  }

  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </legend>
      <div className="space-y-2">
        {languages.map((l) => (
          <label key={l.code} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase text-slate-400">
              {l.code} · {l.name}
            </span>
            {multiline ? (
              <textarea
                rows={3}
                value={value[l.code] ?? ''}
                placeholder={placeholder}
                onChange={(e) => set(l.code, e.target.value)}
                className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            ) : (
              <input
                type="text"
                value={value[l.code] ?? ''}
                placeholder={placeholder}
                onChange={(e) => set(l.code, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
