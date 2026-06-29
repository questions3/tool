import { useState } from 'react'
import type { Language } from '../../types'
import { deleteLanguage, saveLanguage } from '../../data/repository'

interface Props {
  languages: Language[]
  onChanged: () => Promise<void>
}

interface Draft {
  code: string
  name: string
  isEnabled: boolean
  sortOrder: number
  isNew: boolean
}

export function LanguagesSection({ languages, onChanged }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startCreate() {
    setError(null)
    setDraft({
      code: '',
      name: '',
      isEnabled: true,
      sortOrder: languages.length,
      isNew: true,
    })
  }

  function startEdit(l: Language) {
    setError(null)
    setDraft({ ...l, isNew: false })
  }

  async function save() {
    if (!draft) return
    const code = draft.code.trim().toLowerCase()
    if (!/^[a-z]{2,5}$/.test(code)) {
      setError('Код языка — 2–5 латинских букв (ru, pl, de, es, en).')
      return
    }
    if (!draft.name.trim()) {
      setError('Укажите название языка.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveLanguage({
        code,
        name: draft.name.trim(),
        isEnabled: draft.isEnabled,
        sortOrder: draft.sortOrder,
      })
      await onChanged()
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(l: Language) {
    if (
      !confirm(
        `Удалить язык «${l.name}» (${l.code})?\nТексты на этом языке в JSONB останутся, но перестанут показываться.`,
      )
    )
      return
    setBusy(true)
    try {
      await deleteLanguage(l.code)
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Языки</h2>
        <button
          onClick={startCreate}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Добавить язык
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Языки — это «категории» контента. Добавив язык, вы получите поле под него
        во всех формах (возражения, этапы, скрипты).
      </p>

      <ul className="space-y-2">
        {languages.map((l) => (
          <li
            key={l.code}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-700">
                {l.code.toUpperCase()}
              </code>
              <span className="text-slate-900">{l.name}</span>
              {!l.isEnabled && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">
                  выключен
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startEdit(l)}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Изменить
              </button>
              <button
                onClick={() => remove(l)}
                disabled={busy}
                className="rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          </li>
        ))}
        {languages.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            Языков пока нет — добавьте первый
          </li>
        )}
      </ul>

      {draft && (
        <div className="mt-5 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
          <h3 className="font-semibold text-slate-900">
            {draft.isNew ? 'Новый язык' : `Язык: ${draft.code.toUpperCase()}`}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Код
              </span>
              <input
                value={draft.code}
                disabled={!draft.isNew}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="en"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Название
              </span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="English"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Порядок (sort)
              </span>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value) })
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.isEnabled}
                onChange={(e) =>
                  setDraft({ ...draft, isEnabled: e.target.checked })
                }
              />
              Включён
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              onClick={() => setDraft(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
