import { useState } from 'react'
import type { Language, Objection } from '../../types'
import {
  cloneObjectionLang,
  deleteObjection,
  saveObjection,
} from '../../data/repository'
import { pick } from '../../i18n/ui'
import { TermSection } from './TermSection'

interface Props {
  lang: string
  languages: Language[]
  objections: Objection[]
  onChanged: () => Promise<void>
}

export function ObjectionsSection({
  lang,
  languages,
  objections,
  onChanged,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      <TermSection
        title="Возражения"
        singular="возражение"
        table="objections"
        lang={lang}
        languages={languages}
        items={objections}
        onSave={saveObjection}
        onDelete={deleteObjection}
        onChanged={onChanged}
      />
      <ClonePanel
        lang={lang}
        languages={languages}
        objections={objections}
        onChanged={onChanged}
      />
    </div>
  )
}

/**
 * Копия возражения на другой язык — заготовка для переводчика.
 *
 * Копируются название, подсказка, скрипты и ветки; заполняются только
 * пустые места. Язык помечается как непереведённый, поэтому оператору
 * копия не показывается: иначе он прочитал бы клиенту чужой язык вместо
 * перевода. Пометка снимается, когда переводчик правит текст.
 */
function ClonePanel({
  lang,
  languages,
  objections,
  onChanged,
}: {
  lang: string
  languages: Language[]
  objections: Objection[]
  onChanged: () => Promise<void>
}) {
  const [objectionId, setObjectionId] = useState('')
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Источник — любой язык, кроме текущего языка заполнения.
  const sources = languages.filter((l) => l.code !== lang)
  const chosen = objections.find((o) => o.id === objectionId)
  const ready = Boolean(objectionId && from)

  async function run() {
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      await cloneObjectionLang(objectionId, from, lang)
      await onChanged()
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (sources.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Скопировать на «{lang.toUpperCase()}» с другого языка
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Заполняет только пустые поля. Скопированный текст помечается как
        непереведённый и оператору не показывается, пока его не отредактируют.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Возражение
          </span>
          <select
            value={objectionId}
            onChange={(e) => {
              setObjectionId(e.target.value)
              setDone(false)
            }}
            className="min-w-[14rem] rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="">— выберите —</option>
            {objections.map((o) => (
              <option key={o.id} value={o.id}>
                {pick(o.label, lang) || Object.values(o.label)[0] || o.slug}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Откуда
          </span>
          <select
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setDone(false)
            }}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-accent"
          >
            <option value="">— язык —</option>
            {sources.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => void run()}
          disabled={!ready || busy}
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Копируем…' : 'Скопировать'}
        </button>
      </div>

      {chosen && from && !done && (
        <p className="mt-2 text-xs text-slate-400">
          «{pick(chosen.label, from) || '—'}» → {lang.toUpperCase()}
        </p>
      )}
      {done && (
        <p className="mt-2 text-sm text-emerald-700">
          Готово. Тексты скопированы и ждут перевода на вкладке «Скрипты».
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">Ошибка: {error}</p>}
    </div>
  )
}
