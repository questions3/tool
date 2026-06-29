import { useState } from 'react'
import type { Lang, Language } from '../types'
import { t } from '../i18n/ui'
import { LangToggle } from './LangToggle'

interface Props {
  lang: Lang
  languages: Language[]
  onLangChange: (lang: Lang) => void
  login: (password: string) => boolean
  usingDefaultPassword: boolean
}

export function Login({
  lang,
  languages,
  onLangChange,
  login,
  usingDefaultPassword,
}: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!login(password)) {
      setError(t('invalidPassword', lang))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md fade-in">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark lang={lang} />
          <LangToggle lang={lang} languages={languages} onChange={onLangChange} />
        </div>

        <div className="card rounded-2xl border border-slate-200 bg-white p-7">
          <form onSubmit={submit} noValidate>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('loginTitle', lang)}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {t('loginSubtitle', lang)}
            </p>

            <label
              htmlFor="login-password"
              className="mt-6 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              {t('passwordLabel', lang)}
            </label>
            <input
              id="login-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              placeholder={t('passwordPlaceholder', lang)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-hover"
            >
              {t('enter', lang)}
            </button>
          </form>
        </div>

        {usingDefaultPassword ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-amber-600">
            <span aria-hidden>⚠</span>
            {t('defaultPasswordWarning', lang)}
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-slate-400">
            {t('passwordHint', lang)}
          </p>
        )}
      </div>
    </div>
  )
}

function Wordmark({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
        C
      </span>
      <div className="leading-tight">
        <div className="text-lg font-bold text-slate-900">
          {t('appName', lang)}
        </div>
        <div className="text-[11px] text-slate-500">{t('appTagline', lang)}</div>
      </div>
    </div>
  )
}
