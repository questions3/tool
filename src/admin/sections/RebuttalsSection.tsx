import { useEffect, useRef, useState } from 'react'
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
  fetchRebuttal,
  saveBranch,
  saveRebuttal,
} from '../../data/repository'
import { hasLang, pick } from '../../i18n/ui'
import { LocalizedInput } from '../components/LocalizedInput'

interface Props {
  lang: string
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

/** Ветка считается заполненной, если есть хоть какой-то непустой текст. */
function branchHasContent(b: BranchDraft): boolean {
  return [b.label, b.condition, b.response].some((loc) =>
    Object.values(loc).some((v) => typeof v === 'string' && v.trim() !== ''),
  )
}

export function RebuttalsSection({
  lang,
  languages,
  objections,
  stages,
  rebuttals,
  onChanged,
}: Props) {
  const langName = languages.find((l) => l.code === lang)?.name
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
  const loadedKey = useRef<string | null>(null)

  // Сбрасываем форму ТОЛЬКО при смене пары (возражение × этап). Рефетчи
  // (в т.ч. после собственного сохранения) больше не затирают правки формы.
  useEffect(() => {
    const key = `${objId}:${stageId}`
    if (loadedKey.current === key) return
    loadedKey.current = key
    setForm(toForm(current))
    setRemovedIds([])
    setError(null)
    setSaved(false)
    // current берётся из актуального rebuttals на момент смены пары
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
    if (!(form.answer[lang] ?? '').trim()) {
      setError(`Заполните базовый ответ для языка ${lang.toUpperCase()}.`)
      return
    }
    // Полностью пустые ветки не сохраняем.
    const branches = form.branches.filter(branchHasContent)
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
      // Фиксируем id сразу — иначе повторное сохранение сделает второй INSERT
      // и упрётся в unique(objection_id, stage_id).
      setForm((f) => ({ ...f, id: rebuttalId }))
      for (const id of removedIds) await deleteBranch(id)
      setRemovedIds([]) // удаления уже применены — не повторять при ретрае
      await Promise.all(
        branches.map((b, i) =>
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
      // Перечитываем пару, чтобы получить id новых веток (иначе следующее
      // сохранение вставит их повторно). Эффект формы не сработает — пара та же.
      const fresh = await fetchRebuttal(objId, stageId)
      setForm(toForm(fresh ?? undefined))
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Скрипты</h2>

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
                {pick(o.label, lang) || o.slug}
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
                {pick(s.label, lang) || s.slug}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-4">
        <LocalizedInput
          label="Базовый ответ (answer)"
          value={form.answer}
          lang={lang}
          langName={langName}
          onChange={(answer) => setForm((f) => ({ ...f, answer }))}
          multiline
        />
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] font-medium uppercase text-slate-400">
            Переводы ответа:
          </span>
          {languages.map((l) => (
            <span
              key={l.code}
              title={l.name}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                hasLang(form.answer, l.code)
                  ? 'bg-accent-soft text-accent'
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              {l.code.toUpperCase()}
            </span>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isDraft}
            onChange={(e) =>
              setForm((f) => ({ ...f, isDraft: e.target.checked }))
            }
          />
          Черновик
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
                  lang={lang}
                  langName={langName}
                  onChange={(label) => patchBranch(i, { label })}
                />
                <LocalizedInput
                  label="Условие (condition)"
                  value={b.condition}
                  lang={lang}
                  langName={langName}
                  onChange={(condition) => patchBranch(i, { condition })}
                />
                <LocalizedInput
                  label="Ответ (response)"
                  value={b.response}
                  lang={lang}
                  langName={langName}
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

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {saved && (
            <p className="mb-2 text-sm text-emerald-600">Сохранено ✓</p>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60 sm:w-auto"
          >
            {busy ? 'Сохранение…' : 'Сохранить скрипт'}
          </button>
        </div>
      </div>
    </section>
  )
}
