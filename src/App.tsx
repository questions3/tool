import { useEffect, useMemo, useState } from 'react'
import type { Lang, Rebuttal, SectionId } from './types'
import { useAuth } from './hooks/useAuth'
import { useContent } from './hooks/useContent'
import { hasLang, pick, t, type UiKey } from './i18n/ui'
import { fallbackLanguages } from './data/content'
import { Login } from './components/Login'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { SelectScreen } from './components/SelectScreen'
import { AnswerScreen } from './components/AnswerScreen'
import { HomeScreen } from './components/HomeScreen'
import { SectionScreen } from './components/SectionScreen'

const LANG_KEY = 'convvy.lang'

/** Текущий экран агента: главная, поток возражений или один из разделов. */
type View = 'home' | 'objections' | SectionId

/** Заголовок раздела для крошек/шапки. */
const SECTION_TITLE: Record<SectionId, UiKey> = {
  presentation: 'navPresentations',
  service: 'navServices',
  market: 'navMarket',
}

function loadLang(): Lang {
  return localStorage.getItem(LANG_KEY) ?? 'ru'
}

export default function App() {
  const { session, loading: authLoading, configured, requestCode, verifyCode, signOut } =
    useAuth()
  const content = useContent()
  const { languages, loadRebuttal } = content

  const [lang, setLang] = useState<Lang>(() => loadLang())
  const [view, setView] = useState<View>('home')
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

  // Смена языка = смена фильтра: сбрасываем выбор в потоке возражений,
  // чтобы не остаться на возражении, которого нет в новом языке.
  useEffect(() => {
    setObjectionId(null)
    setStageId(null)
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

  function goHome() {
    setObjectionId(null)
    setStageId(null)
    setView('home')
  }

  function handleLogout() {
    goHome()
    void signOut()
  }

  return (
    <div className="min-h-dvh">
      <Header
        lang={lang}
        languages={langOptions}
        onLangChange={setLang}
        onLogout={handleLogout}
        onHome={goHome}
      />

      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        {view === 'home' && (
          <HomeScreen lang={lang} onSelect={(choice) => setView(choice)} />
        )}

        {view === 'objections' && (
          <ObjectionsFlow
            lang={lang}
            content={content}
            objectionId={objectionId}
            stageId={stageId}
            setObjectionId={setObjectionId}
            setStageId={setStageId}
            loadRebuttal={loadRebuttal}
          />
        )}

        {view !== 'home' && view !== 'objections' && (
          <SectionScreen
            lang={lang}
            section={view}
            titleKey={SECTION_TITLE[view]}
            onHome={goHome}
          />
        )}
      </main>
    </div>
  )
}

function ObjectionsFlow({
  lang,
  content,
  objectionId,
  stageId,
  setObjectionId,
  setStageId,
  loadRebuttal,
}: {
  lang: Lang
  content: ReturnType<typeof useContent>
  objectionId: string | null
  stageId: string | null
  setObjectionId: (id: string | null) => void
  setStageId: (id: string | null) => void
  loadRebuttal: (o: string, s: string) => Promise<Rebuttal | null>
}) {
  const { objections, stages } = content

  // Языковой фильтр: только переведённые на выбранный язык.
  const visibleObjections = objections.filter((o) => hasLang(o.label, lang))
  const visibleStages = stages.filter((s) => hasLang(s.label, lang))

  const step: 1 | 2 | 3 = !objectionId ? 1 : !stageId ? 2 : 3
  const objection = objections.find((o) => o.id === objectionId)
  const stage = stages.find((s) => s.id === stageId)

  return (
    <>
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
      {content.error && <Notice tone="error">{t('loadError', lang)}</Notice>}
      {!content.loading && !content.error && visibleObjections.length === 0 && (
        <Notice>{t('noEntries', lang)}</Notice>
      )}

      {!content.loading && !content.error && visibleObjections.length > 0 && (
        <>
          {step === 1 && (
            <SelectScreen
              lang={lang}
              stepLabel={`${t('step', lang)} 1`}
              title={t('step1Title', lang)}
              columns={2}
              items={visibleObjections.map((o) => ({
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
              items={visibleStages.map((s) => ({
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
    </>
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
  // Языковой фильтр: ответ показываем только если он есть на выбранном языке.
  if (!rebuttal || !hasLang(rebuttal.answer, lang))
    return <Notice>{t('noScript', lang)}</Notice>

  return (
    <AnswerScreen
      lang={lang}
      objectionLabel={objectionLabel}
      stageLabel={stageLabel}
      rebuttal={rebuttal}
    />
  )
}
