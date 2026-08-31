import { useCallback, useEffect, useState } from 'react'
import {
  fetchFeedbackSummary,
  fetchSuggestions,
  setSuggestionStatus,
  type FeedbackRow,
  type SuggestionRow,
  type SuggestionStatus,
} from '../../data/repository'
import { pick } from '../../i18n/ui'
import { IconThumbDown, IconThumbUp } from '../../components/icons'

interface Props {
  lang: string
  /** Супервайзер: читает отчёты, но не разбирает предложения. */
  readOnly?: boolean
}

const PERIODS = [
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
  { days: 365, label: 'Год' },
]

const STATUSES: { id: SuggestionStatus; label: string }[] = [
  { id: 'new', label: 'Новые' },
  { id: 'done', label: 'Учтённые' },
  { id: 'dismissed', label: 'Отклонённые' },
]

/**
 * Обратная связь операторов: голоса по скриптам и предложенные правки.
 *
 * Оператор на линии первым слышит, что формулировка не заходит. Раньше
 * этот сигнал терялся между звонками — здесь он собирается и разбирается.
 */
export function FeedbackSection({ lang, readOnly = false }: Props) {
  const [days, setDays] = useState(90)
  const [status, setStatus] = useState<SuggestionStatus>('new')
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [f, s] = await Promise.all([
        fetchFeedbackSummary(days),
        fetchSuggestions(status),
      ])
      setRows(f)
      setSuggestions(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [days, status])

  useEffect(() => {
    void load()
  }, [load])

  async function triage(id: string, next: SuggestionStatus) {
    setBusy(id)
    setError(null)
    try {
      await setSuggestionStatus(id, next)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="flex flex-col gap-8">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Ошибка: {error}
        </p>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            Оценки скриптов
          </h2>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`rounded-md px-2.5 py-1 text-sm transition ${
                  days === p.days
                    ? 'bg-accent text-white'
                    : 'text-ink-2 hover:bg-panel'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-ink-3">Загрузка…</p>}

        {!loading && rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            Операторы ещё не оценивали скрипты. Кнопки стоят под каждым
            скриптом, оценка добровольная.
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="bg-canvas text-left text-xs uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2 font-medium">Возражение</th>
                  <th className="px-4 py-2 font-medium">Этап</th>
                  <th className="px-4 py-2 font-medium">
                    <span className="flex justify-end" title="Скрипт помог">
                      <IconThumbUp size={15} />
                    </span>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <span className="flex justify-end" title="Скрипт не помог">
                      <IconThumbDown size={15} />
                    </span>
                  </th>
                  <th className="px-4 py-2 text-right font-medium">Правки</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.objectionId}:${r.stageId}`}
                    className="border-t border-line"
                  >
                    <td className="max-w-[16rem] truncate px-4 py-2 text-ink">
                      {pick(r.label, lang) || Object.values(r.label)[0] || '—'}
                    </td>
                    <td className="px-4 py-2 text-ink-3">
                      {pick(r.stageLabel, lang) ||
                        Object.values(r.stageLabel)[0] ||
                        '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-3">
                      {r.up || '—'}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        r.down > r.up
                          ? 'font-semibold text-rose-700'
                          : 'text-ink-3'
                      }`}
                    >
                      {r.down || '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-3">
                      {r.suggestions || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            Предложенные правки
          </h2>
          <div className="flex gap-1">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`rounded-md px-2.5 py-1 text-sm transition ${
                  status === s.id
                    ? 'bg-accent text-white'
                    : 'text-ink-2 hover:bg-panel'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && suggestions.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            {status === 'new'
              ? 'Новых предложений нет.'
              : 'В этой стопке пусто.'}
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-line bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-3">
                <span>
                  {s.agentEmail ?? 'без автора'} · {s.lang.toUpperCase()} ·{' '}
                  {formatWhen(s.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                {s.body}
              </p>
              {status === 'new' && !readOnly && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => void triage(s.id, 'done')}
                    disabled={busy === s.id}
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Учтено
                  </button>
                  <button
                    onClick={() => void triage(s.id, 'dismissed')}
                    disabled={busy === s.id}
                    className="rounded-md border border-line px-3 py-1 text-sm text-ink-3 transition hover:bg-canvas disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                </div>
              )}
              {status !== 'new' && !readOnly && (
                <button
                  onClick={() => void triage(s.id, 'new')}
                  disabled={busy === s.id}
                  className="mt-2 rounded text-xs text-ink-3 underline underline-offset-2 hover:text-ink-2 disabled:opacity-50"
                >
                  Вернуть в новые
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
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
