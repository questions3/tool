import { useCallback, useEffect, useState } from 'react'
import type { Entry, Language, Localized, SectionId } from '../../types'
import {
  deleteEntry,
  fetchEntriesAll,
  reorderSwap,
  saveEntry,
} from '../../data/repository'
import { useConfirm } from '../components/Confirm'

interface Props {
  section: SectionId
  /** Заголовок раздела («Презентации» и т.п.). */
  title: string
  /** Активный язык заполнения (общий переключатель в шапке). */
  lang: string
  languages: Language[]
}

interface Draft {
  id?: string
  title: Localized
  body: Localized
  isEnabled: boolean
  sortOrder: number
}

function has(value: Localized, code: string): boolean {
  const v = value[code]
  return typeof v === 'string' && v.trim() !== ''
}

/**
 * Управление элементами раздела (презентации / сервисы / рынок).
 *
 * Сценарий заполнения: сверху выбирается язык, затем заполняются поля именно
 * для него. Элемент — общая запись с переводами; переключив язык, можно
 * добавить перевод к тому же элементу (остальные языки сохраняются).
 */
export function EntriesSection({ section, title, lang, languages }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const confirm = useConfirm()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEntries(await fetchEntriesAll(section))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [section])

  useEffect(() => {
    void reload()
  }, [reload])

  const langName =
    languages.find((l) => l.code === lang)?.name ?? lang.toUpperCase()

  function startCreate() {
    setFormError(null)
    const sortOrder =
      entries.reduce((m, e) => Math.max(m, e.sortOrder ?? 0), -1) + 1
    setDraft({ title: {}, body: {}, isEnabled: true, sortOrder })
  }

  function startEdit(e: Entry) {
    setFormError(null)
    setDraft({
      id: e.id,
      title: { ...e.title },
      body: { ...e.body },
      isEnabled: e.isEnabled ?? true,
      sortOrder: e.sortOrder ?? 0,
    })
  }

  function setField(field: 'title' | 'body', value: string) {
    setDraft((d) =>
      d ? { ...d, [field]: { ...d[field], [lang]: value } } : d,
    )
  }

  async function save() {
    if (!draft) return
    const titleText = (draft.title[lang] ?? '').trim()
    const bodyText = (draft.body[lang] ?? '').trim()
    if (!titleText) {
      setFormError(`Заполните заголовок для языка ${lang.toUpperCase()}.`)
      return
    }
    if (!bodyText) {
      setFormError(`Заполните контент для языка ${lang.toUpperCase()}.`)
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await saveEntry({
        id: draft.id,
        section,
        title: { ...draft.title, [lang]: titleText },
        body: { ...draft.body, [lang]: bodyText },
        isEnabled: draft.isEnabled,
        sortOrder: draft.sortOrder,
      })
      await reload()
      setDraft(null)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(e: Entry) {
    const name = e.title[lang] || Object.values(e.title)[0] || '—'
    const ok = await confirm({
      message: `Удалить «${name}»? Будут удалены все языки этого элемента.`,
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteEntry(e.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  /** Поменять местами с соседом (стрелки ↑/↓ в списке). */
  async function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (busy || target < 0 || target >= entries.length) return
    setBusy(true)
    setError(null)
    try {
      // Атомарный swap в одной транзакции — частичный сбой не оставит
      // два одинаковых sort_order и не перепутает порядок.
      await reorderSwap('entries', entries[index].id, entries[target].id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button
          onClick={startCreate}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Добавить
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Ошибка: {error}
        </p>
      )}

      {!loading && !error && (
        <ul className="space-y-2">
          {entries.map((e, idx) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">
                    {e.title[lang] || (
                      <em className="text-slate-400">
                        нет перевода ({lang.toUpperCase()})
                      </em>
                    )}
                  </span>
                  {e.isEnabled === false && (
                    <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">
                      выключено
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {languages.map((l) => (
                    <span
                      key={l.code}
                      title={l.name}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        has(e.title, l.code)
                          ? 'bg-accent-soft text-accent'
                          : 'bg-slate-100 text-slate-300'
                      }`}
                    >
                      {l.code.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={busy || idx === 0}
                    aria-label="Выше"
                    className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={busy || idx === entries.length - 1}
                    aria-label="Ниже"
                    className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => startEdit(e)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Изменить
                </button>
                <button
                  onClick={() => remove(e)}
                  disabled={busy}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Пока пусто — добавьте первый элемент
            </li>
          )}
        </ul>
      )}

      {/* Шаг 2 — заполнение для выбранного языка */}
      {draft && (
        <div className="mt-5 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
          <h3 className="font-semibold text-slate-900">
            {draft.id ? 'Редактирование' : 'Новый элемент'} ·{' '}
            <span className="text-accent">
              {lang.toUpperCase()} · {langName}
            </span>
          </h3>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Заголовок ({lang.toUpperCase()})
            </span>
            <input
              value={draft.title[lang] ?? ''}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Заголовок в списке"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Контент ({lang.toUpperCase()})
            </span>
            <textarea
              rows={5}
              value={draft.body[lang] ?? ''}
              onChange={(e) => setField('body', e.target.value)}
              placeholder="Текст спича / презентации"
              className="resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, isEnabled: e.target.checked } : d,
                )
              }
            />
            Включено (показывать агентам)
          </label>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

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
