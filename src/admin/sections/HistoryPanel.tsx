import { useCallback, useEffect, useState } from 'react'
import {
  fetchHistory,
  fetchVersionText,
  restoreVersion,
  type VersionRow,
} from '../../data/repository'
import { useConfirm } from '../components/Confirm'

interface Props {
  /** null — скрипт ещё не сохранён, истории у него быть не может. */
  rebuttalId: string | null
  lang: string
  /** Перечитать форму после отката. */
  onRestored: () => void | Promise<void>
}

/**
 * История правок скрипта и откат.
 *
 * Раньше правка затирала старый текст навсегда, и если новый вариант
 * оказывался хуже — возвращаться было не к чему. Снимок пишет триггер в
 * базе, поэтому в историю попадает любая правка, откуда бы она ни
 * пришла: из этой формы, из импорта или напрямую из SQL.
 */
export function HistoryPanel({ rebuttalId, lang, onRestored }: Props) {
  const confirm = useConfirm()
  const [rows, setRows] = useState<VersionRow[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!rebuttalId) return
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchHistory(rebuttalId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [rebuttalId])

  // Историю грузим только когда её раскрыли: на форме она нужна редко.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  // Сменили скрипт — сворачиваем и забываем прошлые тексты.
  useEffect(() => {
    setOpen(false)
    setTexts({})
    setRows([])
  }, [rebuttalId])

  async function toggleText(id: string) {
    if (texts[id] !== undefined) {
      setTexts((t) => {
        const next = { ...t }
        delete next[id]
        return next
      })
      return
    }
    try {
      // Пустая строка — маркер «грузится»: место под текст уже видно.
      setTexts((t) => ({ ...t, [id]: '' }))
      const text = await fetchVersionText(id, lang)
      setTexts((t) => ({ ...t, [id]: text || '— на этом языке текста не было —' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function restore(id: string) {
    const ok = await confirm({
      message:
        'Вернуть скрипт к этой версии? Текущий текст и ветки будут заменены — но сохранятся в истории, откат можно отменить.',
      confirmLabel: 'Вернуть',
    })
    if (!ok) return
    setBusy(id)
    setError(null)
    try {
      await restoreVersion(id)
      await onRestored()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (!rebuttalId) return null

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold text-ink">История правок</span>
        <span className="text-sm text-ink-3">
          {open ? 'Свернуть' : 'Показать'}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {loading && <p className="text-sm text-ink-3">Загрузка…</p>}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              Ошибка: {error}
            </p>
          )}

          {!loading && !error && rows.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">
              Скрипт ещё не правили. Первая версия появится здесь после
              следующего сохранения.
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id} className="rounded-lg border border-line px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm text-ink">
                    {formatWhen(r.createdAt)}
                    <span className="ml-2 text-xs text-ink-3">
                      {r.changedBy ?? 'без автора'}
                    </span>
                  </span>
                  <span className="text-xs text-ink-3">
                    {r.langs.join(' · ').toUpperCase() || '—'} · {r.branches}{' '}
                    {plural(r.branches, 'ветка', 'ветки', 'веток')} ·{' '}
                    {r.chars} зн.
                    {r.isDraft && ' · черновик'}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    onClick={() => void toggleText(r.id)}
                    className="rounded text-xs text-ink-3 underline underline-offset-2 transition-colors duration-200 hover:text-ink"
                  >
                    {texts[r.id] !== undefined ? 'Скрыть текст' : 'Показать текст'}
                  </button>
                  <button
                    onClick={() => void restore(r.id)}
                    disabled={busy === r.id}
                    className="rounded text-xs text-accent underline underline-offset-2 transition-colors duration-200 hover:text-accent-hover disabled:opacity-50"
                  >
                    {busy === r.id ? 'Возвращаем…' : 'Вернуть эту версию'}
                  </button>
                </div>

                {texts[r.id] !== undefined && (
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 font-sans text-sm leading-relaxed text-ink-2">
                    {texts[r.id] || 'Загрузка…'}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
