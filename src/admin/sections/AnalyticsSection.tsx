import { useCallback, useEffect, useState } from 'react'
import {
  fetchAgentLogins,
  fetchOutcomeSummary,
  fetchUsageSummary,
  type LoginRow,
  type OutcomeRow,
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
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([])
  const [logins, setLogins] = useState<LoginRow[]>([])
  const [sortByProblem, setSortByProblem] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, o, l] = await Promise.all([
        fetchUsageSummary(days),
        fetchOutcomeSummary(days),
        fetchAgentLogins(50),
      ])
      setUsage(u)
      setOutcomes(o)
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
          <h2 className="text-lg font-semibold text-ink">
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
                    : 'text-ink-2 hover:bg-panel'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-ink-3">Загрузка…</p>}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Ошибка: {error}
          </p>
        )}

        {!loading && !error && usage.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            За выбранный период открытий не было. Статистика появится, когда
            операторы начнут пользоваться скриптами.
          </p>
        )}

        {!loading && !error && usage.length > 0 && (
          <>
            <p className="mb-3 text-sm text-ink-3">
              Всего открытий: <b className="text-ink">{totalViews}</b> ·
              возражений в работе:{' '}
              <b className="text-ink">{usage.length}</b>
            </p>
            <ul className="flex flex-col gap-2">
              {usage.map((row) => (
                <li
                  key={row.objectionId}
                  className="rounded-lg border border-line bg-white px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-ink">
                      {pick(row.label, lang) ||
                        Object.values(row.label)[0] ||
                        '—'}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-ink-3">
                      {row.views}
                    </span>
                  </div>
                  {/* Полоса — доля от самого популярного возражения. */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
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

      <OutcomesBlock
        rows={outcomes}
        lang={lang}
        loading={loading}
        error={error}
        sortByProblem={sortByProblem}
        onSortChange={setSortByProblem}
      />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Последние входы операторов
        </h2>
        {!loading && !error && logins.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            Входов пока не зафиксировано.
          </p>
        )}
        {logins.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="bg-canvas text-left text-xs uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2 font-medium">Оператор</th>
                  <th className="px-4 py-2 font-medium">Когда</th>
                </tr>
              </thead>
              <tbody>
                {logins.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-4 py-2 text-ink">{l.email}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-3">
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

/**
 * Эффективность скриптов: открытия против отмеченных исходов.
 *
 * Долю успеха нельзя читать в отрыве от числа отметок — отмечают
 * добровольно и выборочно, поэтому рядом всегда стоит охват, а проценты
 * на маленькой выборке помечаются как ненадёжные.
 */
function OutcomesBlock({
  rows,
  lang,
  loading,
  error,
  sortByProblem,
  onSortChange,
}: {
  rows: OutcomeRow[]
  lang: string
  loading: boolean
  error: string | null
  sortByProblem: boolean
  onSortChange: (v: boolean) => void
}) {
  const marked = rows.filter((r) => r.marked > 0)
  const totalViews = rows.reduce((sum, r) => sum + r.views, 0)
  const totalMarked = rows.reduce((sum, r) => sum + r.marked, 0)
  const totalSuccess = rows.reduce((sum, r) => sum + r.success, 0)
  const coverage = totalViews ? Math.round((totalMarked / totalViews) * 100) : 0

  // «По проблемным» — где чаще всего срывается: доля неудач по убыванию.
  const sorted = [...marked].sort((a, b) =>
    sortByProblem ? b.lost / b.marked - a.lost / a.marked : b.marked - a.marked,
  )

  if (loading || error) return null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Эффективность скриптов
        </h2>
        {marked.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => onSortChange(false)}
              className={`rounded-md px-2.5 py-1 text-sm transition ${
                !sortByProblem
                  ? 'bg-accent text-white'
                  : 'text-ink-2 hover:bg-panel'
              }`}
            >
              По отметкам
            </button>
            <button
              onClick={() => onSortChange(true)}
              className={`rounded-md px-2.5 py-1 text-sm transition ${
                sortByProblem
                  ? 'bg-accent text-white'
                  : 'text-ink-2 hover:bg-panel'
              }`}
            >
              По проблемным
            </button>
          </div>
        )}
      </div>

      {marked.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
          Операторы ещё не отмечали исход разговора. Отметка появляется под
          скриптом и ставится по желанию — цифры накопятся за пару недель.
        </p>
      )}

      {marked.length > 0 && (
        <>
          <p className="mb-3 text-sm text-ink-3">
            Отмечено <b className="text-ink">{totalMarked}</b> из{' '}
            {totalViews} открытий ({coverage}%) · успешных{' '}
            <b className="text-ink">
              {Math.round((totalSuccess / totalMarked) * 100)}%
            </b>
          </p>
          {coverage < 20 && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              Размечена малая часть открытий — проценты ниже показывают
              настроение отмечающих, а не всю картину. Выводы стоит делать,
              когда охват дорастёт хотя бы до пятой части.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="bg-canvas text-left text-xs uppercase tracking-wider text-ink-3">
                  <th className="px-4 py-2 font-medium">Возражение</th>
                  <th className="px-4 py-2 text-right font-medium">Открытий</th>
                  <th className="px-4 py-2 text-right font-medium">Отмечено</th>
                  <th className="px-4 py-2 text-right font-medium">Успех</th>
                  <th className="px-4 py-2 font-medium">Разбивка</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const share = Math.round((r.success / r.marked) * 100)
                  // Меньше десяти отметок — цифра случайна, не выделяем её.
                  const thin = r.marked < 10
                  return (
                    <tr key={r.objectionId} className="border-t border-line">
                      <td className="max-w-[18rem] truncate px-4 py-2 text-ink">
                        {pick(r.label, lang) || Object.values(r.label)[0] || '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-3">
                        {r.views}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-3">
                        {r.marked}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${
                          thin
                            ? 'text-ink-3'
                            : share >= 50
                              ? 'font-semibold text-emerald-700'
                              : 'font-semibold text-rose-700'
                        }`}
                        title={thin ? 'Мало отметок — цифра ненадёжна' : undefined}
                      >
                        {share}%{thin && '*'}
                      </td>
                      <td className="px-4 py-2">
                        <Split row={r} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
            <span className="flex items-center gap-3">
              <Dot cls="bg-emerald-500" text="сработало" />
              <Dot cls="bg-amber-400" text="перезвон" />
              <Dot cls="bg-rose-400" text="не сработало" />
            </span>
            {sorted.some((r) => r.marked < 10) && (
              <span>* меньше десяти отметок — на такой выборке процент случаен.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** Точка легенды к полоске разбивки. */
function Dot({ cls, text }: { cls: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${cls}`} />
      {text}
    </span>
  )
}

/** Полоска «сработало / перезвон / не сработало» в пропорции. */
function Split({ row }: { row: OutcomeRow }) {
  const parts = [
    { n: row.success, cls: 'bg-emerald-500', title: 'Сработало' },
    { n: row.callback, cls: 'bg-amber-400', title: 'Перезвон' },
    { n: row.lost, cls: 'bg-rose-400', title: 'Не сработало' },
  ]
  return (
    <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-panel">
      {parts.map((p) => (
        <div
          key={p.title}
          className={p.cls}
          title={`${p.title}: ${p.n}`}
          style={{ width: `${(p.n / row.marked) * 100}%` }}
        />
      ))}
    </div>
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
