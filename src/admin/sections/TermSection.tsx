import { useState } from 'react'
import type { Language, Localized, Objection, Stage } from '../../types'
import { reorderSwap, type TermInput } from '../../data/repository'
import { hasLang } from '../../i18n/ui'
import { LocalizedInput } from '../components/LocalizedInput'
import { useConfirm } from '../components/Confirm'

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
  /** Таблица в БД — для атомарного реордера (стрелки ▲/▼). */
  table: 'objections' | 'stages'
  /** Активный язык заполнения (общий переключатель в шапке). */
  lang: string
  languages: Language[]
  items: Term[]
  onSave: (input: TermInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onChanged: () => Promise<void>
}

/** Следующий sort_order = максимум среди существующих + 1 (в конец списка). */
function nextSortOrder(items: Term[]): number {
  return items.reduce((m, i) => Math.max(m, i.sortOrder ?? 0), -1) + 1
}

/** Postgres unique_violation (дубликат slug). */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === '23505'
}

function emptyDraft(sortOrder: number): DraftTerm {
  return { slug: '', label: {}, hint: {}, isEnabled: true, sortOrder }
}

export function TermSection({
  title,
  singular,
  table,
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
  const [showUntranslated, setShowUntranslated] = useState(false)
  const confirm = useConfirm()

  const langName = languages.find((l) => l.code === lang)?.name

  // По умолчанию показываем только элементы с переводом на выбранный язык
  // (непереведённые агент и так не видит). Их можно раскрыть, чтобы дозаполнить.
  const visible = showUntranslated
    ? items
    : items.filter((t) => hasLang(t.label, lang))
  const hasUntranslated = items.some((t) => !hasLang(t.label, lang))

  function startCreate() {
    setError(null)
    setDraft(emptyDraft(nextSortOrder(items)))
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
    let slug = draft.slug.trim() || uniqueSlug(slugify(title), items, draft.id)
    setBusy(true)
    setError(null)
    try {
      try {
        await onSave({ ...draft, slug })
      } catch (e) {
        // Гонка: кто-то занял этот slug между чтением списка и записью —
        // пробуем ещё раз с числовым суффиксом, чтобы не падать на 23505.
        if (!isUniqueViolation(e)) throw e
        slug = `${slug}_${Date.now().toString(36).slice(-4)}`
        await onSave({ ...draft, slug })
      }
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
    const ok = await confirm({
      message: `Удалить «${name}»? Будут удалены все языки этого элемента.`,
    })
    if (!ok) return
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

  /** Поменять местами с соседом (стрелки ↑/↓ в списке). */
  async function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (busy || target < 0 || target >= visible.length) return
    setBusy(true)
    setError(null)
    try {
      // Меняем местами с соседним ВИДИМЫМ элементом (скрытые без перевода
      // пропускаем). Атомарный swap — порядок не разъедется при сбое.
      await reorderSwap(table, visible[index].id, visible[target].id)
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

      {hasUntranslated && (
        <button
          onClick={() => setShowUntranslated((v) => !v)}
          className="mb-3 text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          {showUntranslated
            ? '− Скрыть без перевода'
            : '+ Показать без перевода'}
        </button>
      )}

      <ul className="space-y-2">
        {visible.map((t, idx) => (
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
                  disabled={busy || idx === visible.length - 1}
                  aria-label="Ниже"
                  className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
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
        {visible.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            {items.length === 0
              ? 'Пока пусто'
              : `Нет элементов с переводом на ${lang.toUpperCase()}`}
          </li>
        )}
      </ul>

      {draft && (
        <div className="mt-5 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
          <h3 className="font-semibold text-slate-900">
            {draft.id ? 'Редактирование' : `Новый: ${singular}`} ·{' '}
            <span className="text-accent">{lang.toUpperCase()}</span>
          </h3>

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
