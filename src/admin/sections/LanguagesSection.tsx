import { useState } from 'react'
import { IconPlus } from '../../components/icons'
import type { Language } from '../../types'
import { deleteLanguage, saveLanguage } from '../../data/repository'
import { useConfirm } from '../components/Confirm'

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
  const confirm = useConfirm()

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
    if (draft.isNew && languages.some((l) => l.code === code)) {
      setError('Язык с таким кодом уже существует.')
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
    setError(null)
    if (languages.length <= 1) {
      setError('Нельзя удалить единственный язык.')
      return
    }
    const ok = await confirm({
      message: `Удалить язык «${l.name}» (${l.code})?\nТексты на этом языке в JSONB останутся, но перестанут показываться.`,
    })
    if (!ok) return
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
        <h2 className="text-lg font-semibold text-ink">Языки</h2>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          <IconPlus size={16} />
          Добавить язык
        </button>
      </div>

      <ul className="space-y-2">
        {languages.map((l) => (
          <li
            key={l.code}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <code className="rounded bg-panel px-2 py-0.5 text-sm font-semibold text-ink-2">
                {l.code.toUpperCase()}
              </code>
              <span className="text-ink">{l.name}</span>
              {!l.isEnabled && (
                <span className="rounded bg-line px-1.5 py-0.5 text-[11px] text-ink-2">
                  выключен
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startEdit(l)}
                className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-2 hover:bg-canvas"
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
          <li className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">
            Языков пока нет — добавьте первый
          </li>
        )}
      </ul>

      {draft && (
        <div className="mt-5 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
          <h3 className="font-semibold text-ink">
            {draft.isNew ? 'Новый язык' : `Язык: ${draft.code.toUpperCase()}`}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Код
              </span>
              <input
                value={draft.code}
                disabled={!draft.isNew}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="en"
                className="rounded-md border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-panel"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Название
              </span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="English"
                className="rounded-md border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Порядок (sort)
              </span>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })
                }
                className="rounded-md border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm text-ink-2">
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
              className="rounded-lg border border-line-strong px-4 py-2 text-sm text-ink-2 hover:bg-canvas"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
