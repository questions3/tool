import { useState } from 'react'
import type { Language, Objection, Stage } from '../../types'
import {
  createObjectionReturningId,
  saveBranch,
  saveRebuttal,
} from '../../data/repository'
import { pick } from '../../i18n/ui'
import { parseFile, type ParsedDoc } from '../../lib/importDoc'

interface Props {
  lang: string
  languages: Language[]
  objections: Objection[]
  stages: Stage[]
  onChanged: () => Promise<void>
}

/** Транслитерация для slug: кириллица и польские диакритики → латиница. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
}

function slugify(text: string, lang: string): string {
  const base = text
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return `${lang}_${base || 'objection'}`
}

/**
 * Импорт возражения из .docx / .xlsx.
 *
 * Повторяет ручной процесс переноса скриптов: файл разбирается на
 * «название + варианты ответа», админ проверяет распознанное в
 * предпросмотре и одним нажатием создаёт возражение, базовый скрипт
 * и ветки what-if. Первый вариант всегда становится базовым ответом.
 */
export function ImportSection({
  lang,
  languages,
  objections,
  stages,
  onChanged,
}: Props) {
  const [parsed, setParsed] = useState<ParsedDoc | null>(null)
  const [fileName, setFileName] = useState('')
  const [title, setTitle] = useState('')
  const [stageId, setStageId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const langName = languages.find((l) => l.code === lang)?.name ?? lang.toUpperCase()
  const visibleStages = stages.filter((s) => s.label[lang])

  async function onPick(file: File | undefined) {
    if (!file) return
    setError(null)
    setDone(null)
    setParsed(null)
    try {
      const doc = await parseFile(file)
      if (doc.items.length === 0) {
        setError('В файле не распознано ни одного варианта ответа.')
        return
      }
      setParsed(doc)
      setTitle(doc.title)
      setFileName(file.name)
      if (!stageId && visibleStages[0]) setStageId(visibleStages[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function runImport() {
    if (!parsed || !title.trim() || !stageId) return
    setBusy(true)
    setError(null)
    try {
      const maxSort = objections.reduce(
        (m, o) => Math.max(m, o.sortOrder ?? 0),
        -1,
      )
      let slug = slugify(title, lang)
      // Slug уникален в таблице — при совпадении добавляем короткий суффикс.
      if (objections.some((o) => o.slug === slug)) {
        slug = `${slug}_${Date.now().toString(36).slice(-4)}`
      }

      const objectionId = await createObjectionReturningId({
        slug,
        label: { [lang]: title.trim() },
        hint: {},
        isEnabled: true,
        sortOrder: maxSort + 1,
      })

      const [base, ...branches] = parsed.items
      const rebuttalId = await saveRebuttal({
        objectionId,
        stageId,
        answer: { [lang]: base.text },
        isDraft: false,
      })

      for (let i = 0; i < branches.length; i++) {
        await saveBranch({
          rebuttalId,
          label: { [lang]: branches[i].label },
          condition: {},
          response: { [lang]: branches[i].text },
          sortOrder: i,
        })
      }

      await onChanged()
      setDone(
        `Импортировано: «${title.trim()}» — базовый скрипт + ${branches.length} ${plural(branches.length)}.`,
      )
      setParsed(null)
      setFileName('')
      setTitle('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Импорт из Word / Excel
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-3">
          Загрузите файл со скриптами — он будет разобран на название
          возражения и варианты ответа. Первый вариант станет базовым
          скриптом, остальные — ветками what-if. Импорт идёт в язык{' '}
          <b className="text-ink-2">{langName}</b>; переключить его можно
          сверху страницы.
        </p>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-ink-2 transition hover:border-accent hover:text-accent">
        <span aria-hidden>📄</span>
        <span>{fileName || 'Выбрать файл .docx или .xlsx'}</span>
        <input
          type="file"
          accept=".docx,.xlsx,.xlsm"
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {done}
        </p>
      )}

      {parsed && (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-ink">
              Распознано ({parsed.source === 'docx' ? 'Word' : 'Excel'})
            </h3>
            <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
              {parsed.items.length}{' '}
              {parsed.items.length === 1 ? 'вариант' : 'варианта(ов)'}
            </span>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Название возражения
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-line-strong px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              Этап разговора
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

          <div className="flex flex-col gap-2">
            {parsed.items.map((it, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-canvas p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                      i === 0
                        ? 'bg-accent-soft text-accent'
                        : 'bg-line text-ink-2'
                    }`}
                  >
                    {i === 0 ? 'Базовый скрипт' : `Ветка · ${it.label}`}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-ink-2">
                  {it.text}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={runImport}
              disabled={busy || !title.trim() || !stageId}
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {busy ? 'Импортируем…' : 'Импортировать'}
            </button>
            <button
              onClick={() => {
                setParsed(null)
                setFileName('')
              }}
              disabled={busy}
              className="rounded-lg border border-line-strong px-5 py-2.5 font-semibold text-ink-2 hover:bg-canvas disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function plural(n: number): string {
  const last = n % 10
  const teen = n % 100 >= 11 && n % 100 <= 14
  if (!teen && last === 1) return 'ветка'
  if (!teen && last >= 2 && last <= 4) return 'ветки'
  return 'веток'
}
