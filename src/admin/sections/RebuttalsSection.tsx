import { useEffect, useState } from 'react'
import type {
  Branch,
  Language,
  Localized,
  Objection,
  Rebuttal,
  Stage,
} from '../../types'
import {
  deleteBranch,
  saveBranch,
  saveRebuttal,
} from '../../data/repository'
import { pick } from '../../i18n/ui'
import { LocalizedInput } from '../components/LocalizedInput'

interface Props {
  languages: Language[]
  objections: Objection[]
  stages: Stage[]
  rebuttals: Rebuttal[]
  onChanged: () => Promise<void>
}

interface BranchDraft extends Branch {
  /** Локальный ключ для React (новые ветки ещё без id из БД). */
  key: string
}

interface Form {
  id?: string
  answer: Localized
  isDraft: boolean
  branches: BranchDraft[]
}

let keySeq = 0
const newKey = () => `b${keySeq++}`

function toForm(r: Rebuttal | undefined): Form {
  return {
    id: r?.id,
    answer: r?.answer ?? {},
    isDraft: r?.draft ?? true,
    branches: (r?.branches ?? []).map((b) => ({ ...b, key: newKey() })),
  }
}

export function RebuttalsSection({
  languages,
  objections,
  stages,
  rebuttals,
  onChanged,
}: Props) {
  const [objId, setObjId] = useState(objections[0]?.id ?? '')
  const [stageId, setStageId] = useState(stages[0]?.id ?? '')
  const current = rebuttals.find(
    (r) => r.objectionId === objId && r.stageId === stageId,
  )

  const [form, setForm] = useState<Form>(() => toForm(current))
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // При смене пары (возражение × этап) перезагружаем форму.
  useEffect(() => {
    setForm(toForm(current))
    setRemovedIds([])
    setError(null)
    setSaved(false)
    // current стабилен для данной пары
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objId, stageId, rebuttals])

  function addBranch() {
    setForm((f) => ({
      ...f,
      branches: [
        ...f.branches,
        { key: newKey(), label: {}, condition: {}, response: {} },
      ],
    }))
  }

  function removeBranch(idx: number) {
    setForm((f) => {
      const b = f.branches[idx]
      if (b.id) setRemovedIds((r) => [...r, b.id as string])
      return { ...f, branches: f.branches.filter((_, i) => i !== idx) }
    })
  }

  function patchBranch(idx: number, patch: Partial<Branch>) {
    setForm((f) => ({
      ...f,
      branches: f.branches.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }))
  }

  async function save() {
    if (!objId || !stageId) {
      setError('Выберите возражение и этап.')
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const rebuttalId = await saveRebuttal({
        id: form.id,
        objectionId: objId,
        stageId,
        answer: form.answer,
        isDraft: form.isDraft,
      })
      for (const id of removedIds) await deleteBranch(id)
      await Promise.all(
        form.branches.map((b, i) =>
          saveBranch({
            id: b.id,
            rebuttalId,
            label: b.label,
            condition: b.condition,
            response: b.response,
            sortOrder: i,
          }),
        ),
      )
      await onChanged()
      setRemovedIds([])
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Скрипты</h2>
      <p className="mb-4 text-sm text-slate-500">
        Выберите пару «возражение × этап» и отредактируйте базовый ответ и ветки
        what-if.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Возражение
          </span>
          <select
            value={objId}
            onChange={(e) => setObjId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {objections.map((o) => (
              <option key={o.id} value={o.id}>
                {pick(o.label, 'ru') || o.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Этап
          </span>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {pick(s.label, 'ru') || s.slug}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-4">
        <LocalizedInput
          label="Базовый ответ (answer)"
          value={form.answer}
          languages={languages}
          onChange={(answer) => setForm((f) => ({ ...f, answer }))}
          multiline
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isDraft}
            onChange={(e) =>
              setForm((f) => ({ ...f, isDraft: e.target.checked }))
            }
          />
          Черновик (показывать бейдж «ждём финальный текст»)
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Ветки what-if</h3>
            <button
              onClick={addBranch}
              className="rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent-soft"
            >
              + Ветка
            </button>
          </div>

          <div className="space-y-4">
            {form.branches.map((b, i) => (
              <div
                key={b.key}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    Ветка {i + 1}
                  </span>
                  <button
                    onClick={() => removeBranch(i)}
                    className="rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Удалить ветку
                  </button>
                </div>
                <LocalizedInput
                  label="Заголовок (label)"
                  value={b.label}
                  languages={languages}
                  onChange={(label) => patchBranch(i, { label })}
                />
                <LocalizedInput
                  label="Условие (condition)"
                  value={b.condition}
                  languages={languages}
                  onChange={(condition) => patchBranch(i, { condition })}
                />
                <LocalizedInput
                  label="Ответ (response)"
                  value={b.response}
                  languages={languages}
                  onChange={(response) => patchBranch(i, { response })}
                  multiline
                />
              </div>
            ))}
            {form.branches.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-400">
                Веток нет
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Сохранено ✓</p>}

        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? 'Сохранение…' : 'Сохранить скрипт'}
        </button>
      </div>
    </section>
  )
}
