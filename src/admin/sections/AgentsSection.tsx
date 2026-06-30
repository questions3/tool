import { useState } from 'react'
import type { AgentEmail } from '../../data/repository'
import { deleteAgentEmail, saveAgentEmail } from '../../data/repository'
import { useConfirm } from '../components/Confirm'

interface Props {
  agentEmails: AgentEmail[]
  onChanged: () => Promise<void>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Белый список email агентов для входа по OTP-коду (`public.agent_emails`).
 * Логин на `/` присылает код только адресам из этого списка.
 */
export function AgentsSection({ agentEmails, onChanged }: Props) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setError('Введите корректный email.')
      return
    }
    if (agentEmails.some((a) => a.email.toLowerCase() === clean)) {
      setError('Этот email уже в списке.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveAgentEmail({ email: clean, note: note.trim() || null })
      await onChanged()
      setEmail('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(a: AgentEmail) {
    const ok = await confirm({
      message: `Убрать доступ для ${a.email}?`,
      confirmLabel: 'Убрать',
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await deleteAgentEmail(a.email)
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Агенты</h2>
      <p className="mb-4 text-sm text-slate-500">
        Кому можно входить в приложение по коду на email. Логин на{' '}
        <code>/</code> отправляет одноразовый код только адресам из этого списка.
      </p>

      <form
        onSubmit={add}
        className="mb-5 space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4"
      >
        <h3 className="font-semibold text-slate-900">Добавить агента</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </span>
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              placeholder="agent@convvy.com"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Имя / заметка (необязательно)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Анна, смена 2"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? 'Сохранение…' : '+ Добавить агента'}
        </button>
      </form>

      <ul className="space-y-2">
        {agentEmails.map((a) => (
          <li
            key={a.email}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-slate-900">{a.email}</div>
              {a.note && (
                <div className="truncate text-xs text-slate-500">{a.note}</div>
              )}
            </div>
            <button
              onClick={() => remove(a)}
              disabled={busy}
              className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Убрать
            </button>
          </li>
        ))}
        {agentEmails.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            Список пуст — добавьте первого агента
          </li>
        )}
      </ul>
    </section>
  )
}
