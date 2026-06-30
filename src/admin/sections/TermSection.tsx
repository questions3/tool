import { useState } from 'react'
import type { Language, Localized, Objection, Stage } from '../../types'
import type { TermInput } from '../../data/repository'
import { hasLang } from '../../i18n/ui'
import { LocalizedInput } from '../components/LocalizedInput'

type Term = Objection | Stage

/** Транслитерация кириллицы для авто-генерации slug из заголовка. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/** Гарантирует уникальность slug среди существующих записей. */
function uniqueSlug(base: string, items: Term[], currentId?: string): string {
  const taken = new Set(
    items.filter((t) => t.id !== currentId).map((t) => t.slug),
  )
  const root = base || 'term'
  let slug = root
  let n = 2
  while (taken.has(slug)) slug = `${root}_${n++}`
  return slug
}

interface DraftTerm {
  id?: string
  slug: string
  label: Localized
  hint: Localized
  isEnabled: boolean
  sortOrder: number
}

interface Props {
  title: string
  /** Слово в единственном числе для кнопки «Добавить …». */
  singular: string
  /** Активный язык заполнения (общий переключатель в шапке). */
  lang: string
  languages: Language[]
  items: Term[]
  onSave: (input: TermInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onChanged: () => Promise<void>
}

function emptyDraft(sortOrder: number): DraftTerm {
  return { slug: '', label: {}, hint: {}, isEnabled: true, sortOrder }
}

export function TermSection({
  title,
  singular,
  lang,
  languages,
  items,
  onSave,
  onDelete,
  onChanged,
}: Props) {
  const [draft, setDraft] = useState<DraftTerm | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const langName = languages.find((l) => l.code === lang)?.name

  function startCreate() {
    setError(null)
    setDraft(emptyDraft(items.length))
  }

  function startEdit(t: Term) {
    setError(null)
    setDraft({
      id: t.id,
      slug: t.slug ?? '',
      label: t.label,
      hint: t.hint,
      isEnabled: t.isEnabled ?? true,
      sortOrder: t.sortOrder ?? 0,
    })
  }

  async function save() {
    if (!draft) return
    const title = (draft.label[lang] ?? '').trim()
    if (!title) {
      setError(`Заполните название для языка ${lang.toUpperCase()}.`)
      return
    }
    // Slug сохраняется при редактировании; для новых — генерируется из заголовка.
    const slug = draft.slug.trim() || uniqueSlug(slugify(title), items, draft.id)
    setBusy(true)
    setError(null)
    try {
      await onSave({ ...draft, slug })
      await onChanged()
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(t: Term) {
    const name = t.label[lang] || Object.values(t.label)[0] || t.slug
    if (!confirm(`Удалить «${name}»? Будут удалены все языки этого элемента.`))
      return
    setBusy(true)
    try {
      await onDelete(t.id)
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button
          onClick={startCreate}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Добавить {singular}
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-900">
                  {t.label[lang] || (
                    <em className="text-slate-400">
                      нет перевода ({lang.toUpperCase()})
                    </em>
                  )}
                </span>
                {t.isEnabled === false && (
                  <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">
                    выключено
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {languages.map((l) => (
                  <span
                    key={l.code}
                    title={l.name}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      hasLang(t.label, l.code)
                        ? 'bg-accent-soft text-accent'
                        : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    {l.code.toUpperCase()}
                  </span>
                ))}
                {t.hint[lang] && (
                  <span className="ml-1 truncate text-sm text-slate-500">
                    {t.hint[lang]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => startEdit(t)}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Изменить
              </button>
              <button
                onClick={() => remove(t)}
                disabled={busy}
                className="rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            Пока пусто
          </li>
        )}
      </ul>

      {draft && (
        <div className="mt-5 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
          <h3 className="font-semibold text-slate-900">
            {draft.id ? 'Редактирование' : `Новый: ${singular}`} ·{' '}
            <span className="text-accent">{lang.toUpperCase()}</span>
          </h3>

          <label className="flex flex-col gap-1 sm:max-w-[12rem]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Порядок (sort)
            </span>
            <input
              type="number"
              value={draft.sortOrder}
              onChange={(e) =>
                setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <LocalizedInput
            label="Название (label)"
            value={draft.label}
            lang={lang}
            langName={langName}
            onChange={(label) => setDraft({ ...draft, label })}
          />
          <LocalizedInput
            label="Подсказка (hint)"
            value={draft.hint}
            lang={lang}
            langName={langName}
            onChange={(hint) => setDraft({ ...draft, hint })}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(e) =>
                setDraft({ ...draft, isEnabled: e.target.checked })
              }
            />
            Включено (показывать агентам)
          </label>

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
