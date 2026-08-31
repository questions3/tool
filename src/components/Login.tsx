import { useState } from 'react'
import type { Lang, Language } from '../types'
import type { AuthFailure, AuthResult } from '../hooks/useAuth'
import { t } from '../i18n/ui'
import type { UiKey } from '../i18n/ui'
import { LangToggle } from './LangToggle'
import { Logo } from './Logo'

interface Props {
  lang: Lang
  languages: Language[]
  configured: boolean
  onLangChange: (lang: Lang) => void
  requestCode: (email: string) => Promise<AuthResult>
  verifyCode: (email: string, token: string) => Promise<AuthResult>
}

/**
 * Длина OTP-кода настраивается в Supabase (Authentication → Email →
 * Email OTP Length, 6–10 цифр). Не фиксируем 6 жёстко, чтобы UI принимал
 * код любой допустимой длины.
 */
const OTP_MIN_LENGTH = 6
const OTP_MAX_LENGTH = 10

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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* Мягкий отсвет бренда за карточкой — единственная декоративная
          заливка во всём приложении, и та на экране, где оператор ещё
          не работает. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-[0.07] blur-3xl brand-fill"
      />
      <div className="relative w-full max-w-md fade-in">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark lang={lang} />
          <LangToggle lang={lang} languages={languages} onChange={onLangChange} />
        </div>

        <div className="card rounded-2xl border border-line bg-white p-7 shadow-[0_12px_40px_-16px_rgba(14,19,48,0.14)]">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {t('loginTitle', lang)}
          </h1>

          {stage === 'email' ? (
            <form onSubmit={submitEmail} noValidate>
              <label
                htmlFor="login-email"
                className="mt-6 block text-xs font-semibold uppercase tracking-wider text-ink-3"
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
                className="mt-2 w-full rounded-lg border border-line-strong bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent/12 disabled:opacity-60"
              />

              {error && <p className="mt-2 text-sm text-red-600">{t(error, lang)}</p>}

              <button
                type="submit"
                disabled={!configured || busy || !email.trim()}
                className="brand-fill mt-6 w-full rounded-xl px-4 py-3 font-semibold text-white shadow-[0_6px_16px_-6px_rgba(87,65,248,0.6)] transition-all duration-200 hover:shadow-[0_10px_22px_-8px_rgba(87,65,248,0.7)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {busy ? t('sending', lang) : t('sendCode', lang)}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <p className="mt-6 text-sm text-ink-3">
                {t('codeSentTo', lang)}{' '}
                <span className="font-semibold text-ink-2">{email}</span>
              </p>

              <label
                htmlFor="login-code"
                className="mt-5 block text-xs font-semibold uppercase tracking-wider text-ink-3"
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
                maxLength={OTP_MAX_LENGTH}
                value={code}
                disabled={busy}
                onChange={(e) => {
                  setCode(
                    e.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH),
                  )
                  if (error) setError(null)
                }}
                placeholder={t('codePlaceholder', lang)}
                className="mt-2 w-full rounded-lg border border-line-strong bg-white px-4 py-3 text-center text-lg tracking-[0.4em] text-ink outline-none transition placeholder:tracking-normal placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent/12 disabled:opacity-60"
              />

              {error && <p className="mt-2 text-sm text-red-600">{t(error, lang)}</p>}

              <button
                type="submit"
                disabled={busy || code.length < OTP_MIN_LENGTH}
                className="brand-fill mt-6 w-full rounded-xl px-4 py-3 font-semibold text-white shadow-[0_6px_16px_-6px_rgba(87,65,248,0.6)] transition-all duration-200 hover:shadow-[0_10px_22px_-8px_rgba(87,65,248,0.7)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {busy ? t('verifying', lang) : t('enter', lang)}
              </button>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={backToEmail}
                  disabled={busy}
                  className="text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline disabled:opacity-60"
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

        <p className="mt-4 text-center text-xs text-ink-3">
          {t('emailHint', lang)}
        </p>
      </div>
    </div>
  )
}

function Wordmark({ lang }: { lang: Lang }) {
  return <Logo size={40} subtitle={t('appTagline', lang)} id="login" />
}
