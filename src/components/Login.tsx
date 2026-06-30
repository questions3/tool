import { useState } from 'react'
import type { Lang, Language } from '../types'
import type { AuthFailure, AuthResult } from '../hooks/useAuth'
import { t } from '../i18n/ui'
import type { UiKey } from '../i18n/ui'
import { LangToggle } from './LangToggle'

interface Props {
  lang: Lang
  languages: Language[]
  configured: boolean
  onLangChange: (lang: Lang) => void
  requestCode: (email: string) => Promise<AuthResult>
  verifyCode: (email: string, token: string) => Promise<AuthResult>
}

/** Причина отказа → ключ локализованного сообщения. */
const FAILURE_MESSAGE: Record<AuthFailure, UiKey> = {
  not_configured: 'errNotConfigured',
  not_allowed: 'errEmailNotAllowed',
  send_failed: 'errSendFailed',
  invalid_code: 'errInvalidCode',
}

export function Login({
  lang,
  languages,
  configured,
  onLangChange,
  requestCode,
  verifyCode,
}: Props) {
  // 'email' — ввод адреса; 'code' — ввод кода из письма.
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<UiKey | null>(null)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !email.trim()) return
    setBusy(true)
    setError(null)
    const res = await requestCode(email)
    setBusy(false)
    if (res.ok) {
      setCode('')
      setStage('code')
    } else {
      setError(FAILURE_MESSAGE[res.reason])
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !code.trim()) return
    setBusy(true)
    setError(null)
    const res = await verifyCode(email, code)
    setBusy(false)
    // При успехе сессия открывается через onAuthStateChange и App
    // перерисует основной экран — отдельной навигации не нужно.
    if (!res.ok) setError(FAILURE_MESSAGE[res.reason])
  }

  function backToEmail() {
    setStage('email')
    setCode('')
    setError(null)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md fade-in">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark lang={lang} />
          <LangToggle lang={lang} languages={languages} onChange={onLangChange} />
        </div>

        <div className="card rounded-2xl border border-slate-200 bg-white p-7">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('loginTitle', lang)}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {t('loginSubtitle', lang)}
          </p>

          {stage === 'email' ? (
            <form onSubmit={submitEmail} noValidate>
              <label
                htmlFor="login-email"
                className="mt-6 block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {t('emailLabel', lang)}
              </label>
              <input
                id="login-email"
                type="email"
                autoFocus
                inputMode="email"
                autoComplete="email"
                value={email}
                disabled={!configured || busy}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={t('emailPlaceholder', lang)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />

              {error && <p className="mt-2 text-sm text-red-600">{t(error, lang)}</p>}

              <button
                type="submit"
                disabled={!configured || busy || !email.trim()}
                className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? t('sending', lang) : t('sendCode', lang)}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <p className="mt-6 text-sm text-slate-500">
                {t('codeSentTo', lang)}{' '}
                <span className="font-semibold text-slate-700">{email}</span>
              </p>

              <label
                htmlFor="login-code"
                className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {t('codeLabel', lang)}
              </label>
              <input
                id="login-code"
                type="text"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                disabled={busy}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''))
                  if (error) setError(null)
                }}
                placeholder={t('codePlaceholder', lang)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg tracking-[0.4em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />

              {error && <p className="mt-2 text-sm text-red-600">{t(error, lang)}</p>}

              <button
                type="submit"
                disabled={busy || code.length < 6}
                className="mt-6 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? t('verifying', lang) : t('enter', lang)}
              </button>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={backToEmail}
                  disabled={busy}
                  className="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-60"
                >
                  {t('changeEmail', lang)}
                </button>
                <button
                  type="button"
                  onClick={submitEmail}
                  disabled={busy}
                  className="text-accent underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {t('resendCode', lang)}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          {configured ? t('emailHint', lang) : t('errNotConfigured', lang)}
        </p>
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
