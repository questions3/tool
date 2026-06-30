import { useCallback, useEffect, useState } from 'react'
import type { Entry, Language, Localized, SectionId } from '../../types'
import { deleteEntry, fetchEntriesAll, saveEntry } from '../../data/repository'

interface Props {
  section: SectionId
  /** Заголовок раздела («Презентации» и т.п.). */
  title: string
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
export function EntriesSection({ section, title, languages }: Props) {
  const [activeLang, setActiveLang] = useState(languages[0]?.code ?? 'ru')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  // Активный язык всегда должен быть среди доступных.
  useEffect(() => {
    if (languages.length && !languages.some((l) => l.code === activeLang)) {
      setActiveLang(languages[0].code)
    }
  }, [languages, activeLang])

  const langName =
    languages.find((l) => l.code === activeLang)?.name ?? activeLang.toUpperCase()

  function startCreate() {
    setFormError(null)
    setDraft({ title: {}, body: {}, isEnabled: true, sortOrder: entries.length })
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
      d ? { ...d, [field]: { ...d[field], [activeLang]: value } } : d,
    )
  }

  async function save() {
    if (!draft) return
    const titleText = (draft.title[activeLang] ?? '').trim()
    const bodyText = (draft.body[activeLang] ?? '').trim()
    if (!titleText) {
      setFormError(`Заполните заголовок для языка ${activeLang.toUpperCase()}.`)
      return
    }
    if (!bodyText) {
      setFormError(`Заполните контент для языка ${activeLang.toUpperCase()}.`)
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await saveEntry({
        id: draft.id,
        section,
        title: { ...draft.title, [activeLang]: titleText },
        body: { ...draft.body, [activeLang]: bodyText },
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
    const name = e.title[activeLang] || Object.values(e.title)[0] || '—'
    if (!confirm(`Удалить «${name}»? Будут удалены все языки этого элемента.`))
      return
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
      <p className="mb-4 text-sm text-slate-500">
        Сначала выберите язык заполнения, затем заполните поля. Переключив язык,
        можно добавить перевод к тому же элементу.
      </p>

      {/* Шаг 1 — выбор языка */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Язык заполнения
        </span>
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => setActiveLang(l.code)}
            title={l.name}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
              activeLang === l.code
                ? 'bg-accent text-white'
                : 'border border-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            {l.code.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Ошибка: {error}
        </p>
      )}

      {!loading && !error && (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">
                    {e.title[activeLang] || (
                      <em className="text-slate-400">
                        нет перевода ({activeLang.toUpperCase()})
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
              <div className="flex shrink-0 gap-2">
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
              {activeLang.toUpperCase()} · {langName}
            </span>
          </h3>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Заголовок ({activeLang.toUpperCase()})
            </span>
            <input
              value={draft.title[activeLang] ?? ''}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Заголовок в списке"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Контент ({activeLang.toUpperCase()})
            </span>
            <textarea
              rows={5}
              value={draft.body[activeLang] ?? ''}
              onChange={(e) => setField('body', e.target.value)}
              placeholder="Текст спича / презентации"
              className="resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Порядок (sort)
              </span>
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? { ...d, sortOrder: Number(e.target.value) || 0 }
                      : d,
                  )
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
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
          </div>

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
