import { useCallback, useEffect, useState } from 'react'
import {
  fetchAgentLogins,
  fetchUsageSummary,
  type LoginRow,
  type UsageRow,
} from '../../data/repository'
import { pick } from '../../i18n/ui'

interface Props {
  /** Язык, на котором показывать названия возражений. */
  lang: string
}

/** Периоды выборки статистики. */
const PERIODS = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
]

/**
 * Аналитика: что операторы реально открывают и кто когда заходил.
 *
 * Данные пишет агентское приложение, читать их может только админ
 * (RLS на script_views / agent_logins).
 */
export function AnalyticsSection({ lang }: Props) {
  const [days, setDays] = useState(30)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [logins, setLogins] = useState<LoginRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, l] = await Promise.all([
        fetchUsageSummary(days),
        fetchAgentLogins(50),
      ])
      setUsage(u)
      setLogins(l)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  const totalViews = usage.reduce((sum, r) => sum + r.views, 0)
  const maxViews = usage.length ? Math.max(...usage.map((r) => r.views)) : 0

  return (
    <section className="flex flex-col gap-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Что открывают операторы
          </h2>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`rounded-md px-2.5 py-1 text-sm transition ${
                  days === p.days
                    ? 'bg-accent text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Ошибка: {error}
          </p>
        )}

        {!loading && !error && usage.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            За выбранный период открытий не было. Статистика появится, когда
            операторы начнут пользоваться скриптами.
          </p>
        )}

        {!loading && !error && usage.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-500">
              Всего открытий: <b className="text-slate-900">{totalViews}</b> ·
              возражений в работе:{' '}
              <b className="text-slate-900">{usage.length}</b>
            </p>
            <ul className="flex flex-col gap-2">
              {usage.map((row) => (
                <li
                  key={row.objectionId}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-slate-900">
                      {pick(row.label, lang) ||
                        Object.values(row.label)[0] ||
                        '—'}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500">
                      {row.views}
                    </span>
                  </div>
                  {/* Полоса — доля от самого популярного возражения. */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${maxViews ? (row.views / maxViews) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Последние входы операторов
        </h2>
        {!loading && !error && logins.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            Входов пока не зафиксировано.
          </p>
        )}
        {logins.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 font-medium">Оператор</th>
                  <th className="px-4 py-2 font-medium">Когда</th>
                </tr>
              </thead>
              <tbody>
                {logins.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-900">{l.email}</td>
                    <td className="px-4 py-2 tabular-nums text-slate-500">
                      {formatWhen(l.loggedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

/** Дата входа в местном формате оператора; при сбое — сырая строка. */
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
