import { useState } from 'react'
import type { Language, Localized, Objection, Stage } from '../../types'
import {
  fetchEntries,
  fetchObjectionTags,
  fetchRebuttals,
  fetchTags,
} from '../../data/repository'
import { buildXlsx, downloadBlob, type Sheet } from '../../lib/exportXlsx'
import { pick } from '../../i18n/ui'

interface Props {
  languages: Language[]
  objections: Objection[]
  stages: Stage[]
}

/**
 * Выгрузка всей базы в Excel — обратная сторона импорта.
 *
 * Нужна для резервной копии, передачи текстов переводчику и отчётности.
 * Раньше контент можно было только занести.
 */
export function ExportSection({ languages, objections, stages }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const codes = languages.map((l) => l.code)

  async function run() {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const [rebuttals, tags, links, presentation, service, market] =
        await Promise.all([
          fetchRebuttals(),
          fetchTags(),
          fetchObjectionTags(),
          fetchEntries('presentation'),
          fetchEntries('service'),
          fetchEntries('market'),
        ])

      const tagName = new Map(tags.map((t) => [t.id, pick(t.label, codes[0] ?? 'ru')]))
      const tagsOf = (id: string) =>
        links
          .filter((l) => l.objectionId === id)
          .map((l) => tagName.get(l.tagId) ?? '')
          .filter(Boolean)
          .join(', ')

      const stageName = new Map(
        stages.map((s) => [s.id, pick(s.label, codes[0] ?? 'ru') || s.slug || s.id]),
      )
      const objName = new Map(
        objections.map((o) => [
          o.id,
          pick(o.label, codes[0] ?? 'ru') || o.slug || o.id,
        ]),
      )

      const loc = (v: Localized) => codes.map((c) => v?.[c] ?? '')

      const sheets: Sheet[] = [
        {
          name: 'Возражения',
          rows: [
            [
              'slug',
              'Теги',
              ...codes.map((c) => `Название ${c.toUpperCase()}`),
              ...codes.map((c) => `Подсказка ${c.toUpperCase()}`),
            ],
            ...objections.map((o) => [
              o.slug ?? '',
              tagsOf(o.id),
              ...loc(o.label),
              ...loc(o.hint),
            ]),
          ],
        },
        {
          name: 'Скрипты',
          rows: [
            [
              'Возражение',
              'Этап',
              'Черновик',
              ...codes.map((c) => `Ответ ${c.toUpperCase()}`),
            ],
            ...rebuttals.map((r) => [
              objName.get(r.objectionId) ?? r.objectionId,
              stageName.get(r.stageId) ?? r.stageId,
              r.draft ? 'да' : '',
              ...loc(r.answer),
            ]),
          ],
        },
        {
          name: 'Ветки',
          rows: [
            [
              'Возражение',
              'Этап',
              ...codes.map((c) => `Метка ${c.toUpperCase()}`),
              ...codes.map((c) => `Условие ${c.toUpperCase()}`),
              ...codes.map((c) => `Ответ ${c.toUpperCase()}`),
            ],
            ...rebuttals.flatMap((r) =>
              r.branches.map((b) => [
                objName.get(r.objectionId) ?? r.objectionId,
                stageName.get(r.stageId) ?? r.stageId,
                ...loc(b.label),
                ...loc(b.condition),
                ...loc(b.response),
              ]),
            ),
          ],
        },
        {
          name: 'Этапы',
          rows: [
            [
              'slug',
              ...codes.map((c) => `Название ${c.toUpperCase()}`),
              ...codes.map((c) => `Подсказка ${c.toUpperCase()}`),
            ],
            ...stages.map((s) => [s.slug ?? '', ...loc(s.label), ...loc(s.hint)]),
          ],
        },
        {
          name: 'Разделы',
          rows: [
            [
              'Раздел',
              ...codes.map((c) => `Заголовок ${c.toUpperCase()}`),
              ...codes.map((c) => `Текст ${c.toUpperCase()}`),
            ],
            ...[
              ['Презентации', presentation],
              ['Сервисы', service],
              ['Рынок', market],
            ].flatMap(([title, list]) =>
              (list as typeof presentation).map((e) => [
                title as string,
                ...loc(e.title),
                ...loc(e.body),
              ]),
            ),
          ],
        },
        {
          name: 'Теги',
          rows: [
            ['slug', ...codes.map((c) => `Название ${c.toUpperCase()}`)],
            ...tags.map((t) => [t.slug, ...loc(t.label)]),
          ],
        },
      ]

      const stamp = new Date().toISOString().slice(0, 10)
      downloadBlob(buildXlsx(sheets), `convvy-${stamp}.xlsx`)
      const rows = sheets.reduce((n, s) => n + s.rows.length - 1, 0)
      setDone(`${sheets.length} листов, ${rows} строк`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <h3 className="text-sm font-semibold text-ink">Выгрузка в Excel</h3>
      <p className="mt-1 text-sm text-ink-3">
        Вся база одной книгой: возражения с тегами, скрипты, ветки, этапы,
        разделы и теги. По колонке на каждый язык — файл годится и как
        резервная копия, и как заготовка для переводчика.
      </p>

      <button
        onClick={() => void run()}
        disabled={busy}
        className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? 'Собираем…' : 'Скачать книгу'}
      </button>

      {done && (
        <p className="mt-2 text-sm text-emerald-700">Готово: {done}.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">Ошибка: {error}</p>}
    </div>
  )
}
