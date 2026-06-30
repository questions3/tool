import { useEffect, useMemo, useState } from 'react'
import type { Lang, Rebuttal } from './types'
import { useAuth } from './hooks/useAuth'
import { useContent } from './hooks/useContent'
import { pick, t } from './i18n/ui'
import { fallbackLanguages } from './data/content'
import { Login } from './components/Login'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { SelectScreen } from './components/SelectScreen'
import { AnswerScreen } from './components/AnswerScreen'

const LANG_KEY = 'convvy.lang'

function loadLang(): Lang {
  return localStorage.getItem(LANG_KEY) ?? 'ru'
}

export default function App() {
  const { session, loading: authLoading, configured, requestCode, verifyCode, signOut } =
    useAuth()
  const content = useContent()
  const { languages, objections, stages, loadRebuttal } = content

  const [lang, setLang] = useState<Lang>(() => loadLang())
  const [objectionId, setObjectionId] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)

  // Список языков для переключателя (до загрузки из БД — фолбэк).
  const langOptions = languages.length ? languages : fallbackLanguages

  // Активный язык всегда должен быть среди доступных.
  useEffect(() => {
    if (!langOptions.some((l) => l.code === lang)) {
      setLang(langOptions[0]?.code ?? 'ru')
    }
  }, [langOptions, lang])

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  // Восстанавливаем сессию из хранилища — не мигаем экраном входа.
  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        {t('loading', lang)}
      </div>
    )
  }

  // Не авторизован — экран входа по коду на email (OTP).
  if (!session) {
    return (
      <Login
        lang={lang}
        languages={langOptions}
        configured={configured}
        onLangChange={setLang}
        requestCode={requestCode}
        verifyCode={verifyCode}
      />
    )
  }

  function reset() {
    setObjectionId(null)
    setStageId(null)
  }

  function handleLogout() {
    reset()
    void signOut()
  }

  const step: 1 | 2 | 3 = !objectionId ? 1 : !stageId ? 2 : 3
  const objection = objections.find((o) => o.id === objectionId)
  const stage = stages.find((s) => s.id === stageId)

  return (
    <div className="min-h-dvh">
      <Header
        lang={lang}
        languages={langOptions}
        onLangChange={setLang}
        onLogout={handleLogout}
        onHome={reset}
      />

      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        <Stepper
          lang={lang}
          active={step}
          crumbs={[
            {
              key: 'stepperObjection',
              value: objection ? pick(objection.label, lang) : undefined,
              onClick: () => {
                setObjectionId(null)
                setStageId(null)
              },
            },
            {
              key: 'stepperStage',
              value: stage ? pick(stage.label, lang) : undefined,
              onClick: () => setStageId(null),
            },
            { key: 'stepperAnswer' },
          ]}
        />

        {content.loading && <Notice>{t('loading', lang)}</Notice>}
        {content.error && (
          <Notice tone="error">{t('loadError', lang)}</Notice>
        )}
        {!content.loading &&
          !content.error &&
          objections.length === 0 && <Notice>{t('emptyContent', lang)}</Notice>}

        {!content.loading && !content.error && objections.length > 0 && (
          <>
            {step === 1 && (
              <SelectScreen
                lang={lang}
                stepLabel={`${t('step', lang)} 1`}
                title={t('step1Title', lang)}
                columns={2}
                items={objections.map((o) => ({
                  id: o.id,
                  label: pick(o.label, lang),
                  hint: pick(o.hint, lang),
                }))}
                onSelect={(id) => setObjectionId(id)}
              />
            )}

            {step === 2 && (
              <SelectScreen
                lang={lang}
                stepLabel={`${t('step', lang)} 2`}
                title={t('step2Title', lang)}
                columns={3}
                items={stages.map((s) => ({
                  id: s.id,
                  label: pick(s.label, lang),
                  hint: pick(s.hint, lang),
                }))}
                onSelect={(id) => setStageId(id)}
              />
            )}

            {step === 3 && objection && stage && (
              <AnswerWrap
                lang={lang}
                objectionId={objection.id}
                stageId={stage.id}
                objectionLabel={pick(objection.label, lang)}
                stageLabel={pick(stage.label, lang)}
                loadRebuttal={loadRebuttal}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Notice({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <p
      className={`rounded-lg border px-4 py-6 text-center text-sm ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      {children}
    </p>
  )
}

function AnswerWrap({
  lang,
  objectionId,
  stageId,
  objectionLabel,
  stageLabel,
  loadRebuttal,
}: {
  lang: Lang
  objectionId: string
  stageId: string
  objectionLabel: string
  stageLabel: string
  loadRebuttal: (o: string, s: string) => Promise<Rebuttal | null>
}) {
  const [rebuttal, setRebuttal] = useState<Rebuttal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const key = useMemo(() => `${objectionId}:${stageId}`, [objectionId, stageId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    loadRebuttal(objectionId, stageId)
      .then((r) => !cancelled && setRebuttal(r))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // key покрывает objectionId+stageId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loadRebuttal])

  if (loading) return <Notice>{t('loading', lang)}</Notice>
  if (error) return <Notice tone="error">{t('loadError', lang)}</Notice>
  if (!rebuttal) return <Notice>{t('emptyContent', lang)}</Notice>

  return (
    <AnswerScreen
      lang={lang}
      objectionLabel={objectionLabel}
      stageLabel={stageLabel}
      rebuttal={rebuttal}
    />
  )
}
