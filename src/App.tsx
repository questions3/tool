import { useEffect, useState } from 'react'
import type { Lang, ObjectionId, StageId } from './types'
import { useAuth } from './hooks/useAuth'
import { t } from './i18n/ui'
import {
  getObjection,
  getRebuttal,
  getStage,
  objections,
  stages,
} from './data/content'
import { Login } from './components/Login'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { SelectScreen } from './components/SelectScreen'
import { AnswerScreen } from './components/AnswerScreen'

const LANG_KEY = 'convvy.lang'

function loadLang(): Lang {
  const v = localStorage.getItem(LANG_KEY)
  return v === 'pl' ? 'pl' : 'ru'
}

export default function App() {
  const { session, login, logout, usingDefaultPassword } = useAuth()
  const [lang, setLang] = useState<Lang>(() => loadLang())

  const [objectionId, setObjectionId] = useState<ObjectionId | null>(null)
  const [stageId, setStageId] = useState<StageId | null>(null)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  // Не авторизован — экран входа
  if (!session) {
    return (
      <Login
        lang={lang}
        onLangChange={setLang}
        login={login}
        usingDefaultPassword={usingDefaultPassword}
      />
    )
  }

  function reset() {
    setObjectionId(null)
    setStageId(null)
  }

  function handleLogout() {
    reset()
    logout()
  }

  // Какой шаг показываем
  const step: 1 | 2 | 3 = !objectionId ? 1 : !stageId ? 2 : 3

  const objection = objectionId ? getObjection(objectionId) : undefined
  const stage = stageId ? getStage(stageId) : undefined

  return (
    <div className="min-h-dvh">
      <Header
        lang={lang}
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
              value: objection?.label[lang],
              onClick: () => {
                setObjectionId(null)
                setStageId(null)
              },
            },
            {
              key: 'stepperStage',
              value: stage?.label[lang],
              onClick: () => setStageId(null),
            },
            { key: 'stepperAnswer' },
          ]}
        />

        {step === 1 && (
          <SelectScreen
            lang={lang}
            stepLabel={`${t('step', lang)} 1`}
            title={t('step1Title', lang)}
            columns={2}
            items={objections.map((o) => ({
              id: o.id,
              label: o.label[lang],
              hint: o.hint[lang],
            }))}
            onSelect={(id) => setObjectionId(id as ObjectionId)}
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
              label: s.label[lang],
              hint: s.hint[lang],
            }))}
            onSelect={(id) => setStageId(id as StageId)}
          />
        )}

        {step === 3 && objection && stage && (
          <AnswerWrap
            lang={lang}
            objectionId={objection.id}
            stageId={stage.id}
            objectionLabel={objection.label[lang]}
            stageLabel={stage.label[lang]}
          />
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-6 pb-8 pt-2 text-center text-xs text-slate-400">
        Convvy · internal tool
      </footer>
    </div>
  )
}

function AnswerWrap({
  lang,
  objectionId,
  stageId,
  objectionLabel,
  stageLabel,
}: {
  lang: Lang
  objectionId: ObjectionId
  stageId: StageId
  objectionLabel: string
  stageLabel: string
}) {
  const rebuttal = getRebuttal(objectionId, stageId)
  if (!rebuttal) return null
  return (
    <AnswerScreen
      lang={lang}
      objectionLabel={objectionLabel}
      stageLabel={stageLabel}
      rebuttal={rebuttal}
    />
  )
}
