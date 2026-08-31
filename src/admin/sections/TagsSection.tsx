import { useCallback, useEffect, useState } from 'react'
import type { Language, Localized, Objection } from '../../types'
import {
  deleteTag,
  fetchObjectionTags,
  fetchTags,
  saveTag,
  setObjectionTags,
  type Tag,
} from '../../data/repository'
import { pick } from '../../i18n/ui'
import { LocalizedInput } from '../components/LocalizedInput'
import { useConfirm } from '../components/Confirm'
import { IconClose } from '../../components/icons'

interface Props {
  lang: string
  languages: Language[]
  objections: Objection[]
}

/**
 * Теги возражений: справочник и расстановка меток.
 *
 * Тег — это не ещё один этап, а поперечный разрез: «цена», «доверие»,
 * «конкуренты». Одно возражение может попадать в несколько тем сразу,
 * поэтому связь многие-ко-многим, а не поле в возражении.
 */
export function TagsSection({ lang, languages, objections }: Props) {
  const confirm = useConfirm()
  const [tags, setTags] = useState<Tag[]>([])
  const [links, setLinks] = useState<{ objectionId: string; tagId: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Localized>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, l] = await Promise.all([fetchTags(), fetchObjectionTags()])
      setTags(t)
      setLinks(l)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function addTag() {
    const label = draft[lang]?.trim()
    if (!label) return
    await run(() =>
      saveTag({ slug: slugify(label), label: draft, sortOrder: tags.length }),
    )
    setDraft({})
  }

  function tagsOf(objectionId: string): string[] {
    return links.filter((l) => l.objectionId === objectionId).map((l) => l.tagId)
  }

  async function toggle(objectionId: string, tagId: string) {
    const current = tagsOf(objectionId)
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId]
    await run(() => setObjectionTags(objectionId, next))
  }

  return (
    <section className="flex flex-col gap-8">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Ошибка: {error}
        </p>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold text-ink">Теги</h2>
        <p className="mb-4 text-sm text-ink-3">
          Оператор фильтрует список возражений по тегам в один клик. Тег без
          названия на языке оператору не показывается.
        </p>

        <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4">
          <LocalizedInput
            label="Название тега"
            value={draft}
            lang={lang}
            langName={languages.find((l) => l.code === lang)?.name}
            onChange={setDraft}
            placeholder="Цена"
          />
          <div>
            <button
              onClick={() => void addTag()}
              disabled={busy || !draft[lang]?.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              Добавить тег
            </button>
          </div>
        </div>

        {loading && <p className="mt-4 text-sm text-ink-3">Загрузка…</p>}

        {!loading && tags.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            Тегов пока нет. Пока их нет, полоска фильтров у оператора не
            появляется.
          </p>
        )}

        {tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-3 pr-1.5 text-sm"
              >
                <span className="text-ink">
                  {pick(tag.label, lang) || (
                    <span className="text-ink-3">
                      без названия на «{lang}»
                    </span>
                  )}
                </span>
                <span className="text-xs text-ink-3">
                  {links.filter((l) => l.tagId === tag.id).length}
                </span>
                <button
                  onClick={() =>
                    void confirm({
                      message:
                        'Удалить тег? Метки на возражениях тоже пропадут, сами возражения останутся.',
                      confirmLabel: 'Удалить',
                    }).then((ok) => {
                      if (ok) void run(() => deleteTag(tag.id))
                    })
                  }
                  aria-label="Удалить тег"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-3 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  <IconClose size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tags.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">
            Метки на возражениях
          </h2>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="bg-canvas text-left text-xs uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2 font-medium">Возражение</th>
                  <th className="px-4 py-2 font-medium">Теги</th>
                </tr>
              </thead>
              <tbody>
                {objections.map((o) => {
                  const mine = tagsOf(o.id)
                  return (
                    <tr key={o.id} className="border-t border-line">
                      <td className="max-w-[16rem] truncate px-4 py-2 text-ink">
                        {pick(o.label, lang) || Object.values(o.label)[0] || '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => {
                            const on = mine.includes(tag.id)
                            return (
                              <button
                                key={tag.id}
                                disabled={busy}
                                onClick={() => void toggle(o.id, tag.id)}
                                className={`rounded-full border px-2.5 py-0.5 text-xs transition disabled:opacity-50 ${
                                  on
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-line text-ink-3 hover:border-accent hover:text-accent'
                                }`}
                              >
                                {pick(tag.label, lang) || tag.slug}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

/** Латинский slug из названия на любом из языков. */
function slugify(text: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
    щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '',
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  }
  const base = text
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // Пустой slug ломает уникальный индекс — подстрахуемся отметкой времени.
  return base || `tag-${Date.now()}`
}
