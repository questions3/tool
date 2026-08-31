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
import { IconCheck, IconClose } from '../../components/icons'
import { AnswerScreen } from '../../components/AnswerScreen'

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
  // В выпадашках показываем только возражения/этапы, заведённые на выбранном
  // языке (у каждого языка — свой каталог возражений).
  const visibleObjections = objections.filter((o) => hasLang(o.label, lang))
  const visibleStages = stages.filter((s) => hasLang(s.label, lang))
  const [objId, setObjId] = useState(visibleObjections[0]?.id ?? '')
  const [stageId, setStageId] = useState(visibleStages[0]?.id ?? '')

  // При смене языка (или списков) держим выбор валидным для текущего языка:
  // если текущее возражение/этап не относится к языку — сбрасываем на первый.
  useEffect(() => {
    const vObj = objections.filter((o) => hasLang(o.label, lang))
    const vStg = stages.filter((s) => hasLang(s.label, lang))
    setObjId((cur) => (vObj.some((o) => o.id === cur) ? cur : vObj[0]?.id ?? ''))
    setStageId((cur) => (vStg.some((s) => s.id === cur) ? cur : vStg[0]?.id ?? ''))
  }, [lang, objections, stages])

  const current = rebuttals.find(
    (r) => r.objectionId === objId && r.stageId === stageId,
  )

  const [form, setForm] = useState<Form>(() => toForm(current))
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
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
      <h2 className="mb-4 text-lg font-semibold text-ink">Скрипты</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Возражение
          </span>
          <select
            value={objId}
            onChange={(e) => setObjId(e.target.value)}
            className="rounded-md border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {visibleObjections.map((o) => (
              <option key={o.id} value={o.id}>
                {pick(o.label, lang) || o.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Этап
          </span>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="rounded-md border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {visibleStages.map((s) => (
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
          <span className="text-[11px] font-medium uppercase text-ink-3">
            Переводы ответа:
          </span>
          {languages.map((l) => (
            <span
              key={l.code}
              title={l.name}
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                hasLang(form.answer, l.code)
                  ? 'bg-accent-soft text-accent'
                  : 'bg-panel text-line-strong'
              }`}
            >
              {l.code.toUpperCase()}
            </span>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-2">
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
            <h3 className="font-semibold text-ink">Ветки what-if</h3>
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
                className="space-y-3 rounded-xl border border-line bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-3">
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
              <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">
                Веток нет
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {saved && (
            <p className="mb-2 flex items-center gap-1.5 text-sm text-emerald-700">
              <IconCheck size={15} /> Сохранено
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {busy ? 'Сохранение…' : 'Сохранить скрипт'}
            </button>
            <button
              onClick={() => setPreview(true)}
              disabled={!objId || !stageId}
              className="rounded-lg border border-line-strong px-5 py-2.5 font-semibold text-ink-2 hover:bg-canvas disabled:opacity-50"
            >
              Предпросмотр
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <PreviewModal
          lang={lang}
          langName={langName ?? lang.toUpperCase()}
          objectionLabel={
            pick(objections.find((o) => o.id === objId)?.label, lang) ||
            '(без названия)'
          }
          stageLabel={
            pick(stages.find((s) => s.id === stageId)?.label, lang) ||
            '(без названия)'
          }
          rebuttal={{
            objectionId: objId,
            stageId,
            answer: form.answer,
            draft: form.isDraft,
            branches: form.branches.filter(branchHasContent),
          }}
          onClose={() => setPreview(false)}
        />
      )}
    </section>
  )
}

/**
 * Предпросмотр «как увидит оператор».
 *
 * Рендерит тот же AnswerScreen, что и агентское приложение, по ТЕКУЩЕМУ
 * состоянию формы — включая несохранённые правки. Так редактор видит
 * реальный перенос строк, абзацы и порядок веток до публикации.
 */
function PreviewModal({
  lang,
  langName,
  objectionLabel,
  stageLabel,
  rebuttal,
  onClose,
}: {
  lang: string
  langName: string
  objectionLabel: string
  stageLabel: string
  rebuttal: Rebuttal
  onClose: () => void
}) {
  // Esc закрывает — привычно для модалок.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const empty = !hasLang(rebuttal.answer, lang)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Предпросмотр скрипта"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink">
              Так увидит оператор
            </span>
            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              {langName}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md px-2 py-1 text-ink-3 transition hover:bg-panel hover:text-ink-2"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto bg-canvas px-5 py-6">
          {empty ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-white px-4 py-8 text-center text-sm text-ink-3">
              Базовый скрипт на языке {langName} пуст — оператор увидит
              «скрипт готовится».
            </p>
          ) : (
            <AnswerScreen
              lang={lang}
              objectionLabel={objectionLabel}
              stageLabel={stageLabel}
              rebuttal={rebuttal}
            />
          )}
        </div>
      </div>
    </div>
  )
}
