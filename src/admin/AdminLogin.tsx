import { useState } from 'react'

interface Props {
  signIn: (email: string, password: string) => Promise<boolean>
  error: string | null
}

export function AdminLogin({ signIn, error }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await signIn(email.trim(), password)
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
            C
          </span>
          <div className="leading-tight">
            <div className="text-lg font-bold text-slate-900">Convvy Admin</div>
            <div className="text-[11px] text-slate-500">Панель управления контентом</div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-7"
        >
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Вход администратора
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Доступ через Supabase Auth
          </p>

          <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Email
          </label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Пароль
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          <a href="/" className="hover:text-slate-600">
            ← Вернуться в приложение
          </a>
        </p>
      </div>
    </div>
  )
}
