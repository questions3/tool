import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchStaleScripts, markReviewed, type StaleRow } from '../../data/repository'
import { pick } from '../../i18n/ui'

interface Props {
  lang: string
}

/** Через сколько дней проверка считается просроченной. */
const STALE_DAYS = 90

/**
 * Актуальность скриптов: когда каждый в последний раз сверяли с условиями.
 *
 * Правка текста и проверка фактов — разные события: текст могли
 * переписать, не сверяя тарифы. Поэтому даты хранятся отдельно, а
 * «изменён после проверки» — отдельный сигнал, а не подмена проверки.
 */
export function FreshnessSection({ lang }: Props) {
  const [rows, setRows] = useState<StaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [onlyProblems, setOnlyProblems] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchStaleScripts(STALE_DAYS))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function isProblem(r: StaleRow): boolean {
    return (
      r.reviewedAt === null ||
      r.changedAfter ||
      (r.daysSince !== null && r.daysSince >= STALE_DAYS)
    )
  }

  const shown = useMemo(
    () => (onlyProblems ? rows.filter(isProblem) : rows),
    [rows, onlyProblems],
  )
  const problems = rows.filter(isProblem).length

  async function review(id: string) {
    setBusy(id)
    setError(null)
    try {
      await markReviewed(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Ошибка: {error}
        </p>
      )}

      <div>
        <h2 className="text-lg font-semibold text-ink">Актуальность</h2>
        <p className="mt-1 text-sm text-ink-3">
          Скрипты устаревают вместе с условиями и тарифами, причём молча.
          Кнопка «Проверено» отмечает, что текст сверили с тем, как всё
          устроено сейчас. Просроченной проверка считается через {STALE_DAYS}{' '}
          дней.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">
          Требуют внимания: <b className="text-ink">{problems}</b> из{' '}
          {rows.length}
        </p>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={onlyProblems}
            onChange={(e) => setOnlyProblems(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong"
          />
          Только требующие внимания
        </label>
      </div>

      {loading && <p className="text-sm text-ink-3">Загрузка…</p>}

      {!loading && shown.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
          {rows.length === 0
            ? 'Опубликованных скриптов нет.'
            : 'Все скрипты проверены и с тех пор не менялись.'}
        </p>
      )}

      {shown.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="bg-canvas text-left text-xs uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2 font-medium">Возражение</th>
                <th className="px-4 py-2 font-medium">Этап</th>
                <th className="px-4 py-2 font-medium">Языки</th>
                <th className="px-4 py-2 font-medium">Проверен</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.rebuttalId} className="border-t border-line">
                  <td className="max-w-[15rem] truncate px-4 py-2 text-ink">
                    {pick(r.label, lang) || Object.values(r.label)[0] || '—'}
                  </td>
                  <td className="px-4 py-2 text-ink-3">
                    {pick(r.stageLabel, lang) ||
                      Object.values(r.stageLabel)[0] ||
                      '—'}
                  </td>
                  <td className="px-4 py-2 text-xs uppercase text-ink-3">
                    {r.langs.join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Status row={r} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => void review(r.rebuttalId)}
                      disabled={busy === r.rebuttalId}
                      className="whitespace-nowrap rounded-md border border-line px-2.5 py-1 text-sm text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {busy === r.rebuttalId ? '…' : 'Проверено'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Состояние проверки словами, а не датой: дата сама по себе ни о чём. */
function Status({ row }: { row: StaleRow }) {
  if (row.reviewedAt === null) {
    return <span className="text-amber-700">ни разу не проверялся</span>
  }
  if (row.changedAfter) {
    return (
      <span className="text-amber-700">
        изменён после проверки
        <span className="ml-1 text-xs text-ink-3">
          {formatDate(row.updatedAt)}
        </span>
      </span>
    )
  }
  const late = row.daysSince !== null && row.daysSince >= STALE_DAYS
  return (
    <span className={late ? 'text-rose-700' : 'text-ink-3'}>
      {formatDate(row.reviewedAt)}
      {row.daysSince !== null && (
        <span className="ml-1 text-xs text-ink-3">
          {row.daysSince} дн. назад
        </span>
      )}
      {row.reviewedBy && (
        <span className="ml-1 text-xs text-ink-3">· {row.reviewedBy}</span>
      )}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
