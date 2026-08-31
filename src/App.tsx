import { useEffect, useMemo, useState } from 'react'
import type { Lang, Localized, Rebuttal, SectionId } from './types'
import { useAuth } from './hooks/useAuth'
import { useContent } from './hooks/useContent'
import { useFavorites } from './hooks/useFavorites'
import { useNote } from './hooks/useNote'
import { useOutcome } from './hooks/useOutcome'
import { useTags } from './hooks/useTags'
import { hasLang, hasTranslated, pick, t, type UiKey } from './i18n/ui'
import { fallbackLanguages } from './data/content'
import { logScriptView, type SearchHit } from './data/repository'
import { withTimeout } from './lib/withTimeout'
import { Login } from './components/Login'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { SelectScreen } from './components/SelectScreen'
import { AnswerScreen } from './components/AnswerScreen'
import { NotePanel } from './components/NotePanel'
import { SearchOverlay } from './components/SearchOverlay'
import { WhatsNew } from './components/WhatsNew'
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
  // Контент читаем только после входа: в фолбэк-режиме (без Supabase) данные
  // берутся статически, иначе — только при наличии сессии (RLS закрыл анонимов).
  const content = useContent(!configured || !!session)
  const { languages, loadRebuttal } = content

  const [lang, setLang] = useState<Lang>(() => loadLang())
  const [view, setView] = useState<View>('home')
  const [objectionId, setObjectionId] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

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

  // Ctrl/Cmd+K — общий поиск из любого места приложения.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Восстанавливаем сессию из хранилища — не мигаем экраном входа.
  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        {t('loading', lang)}
      </div>
    )
  }

  // Не авторизован — экран входа по коду на email (OTP).
  // Если Supabase не настроен, аутентифицировать нечем — показываем
  // приложение на встроенном (фолбэк) контенте, а не запертый экран входа.
  if (!session && configured) {
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

  /** Переход по результату поиска: открываем ровно тот экран, где он лежит. */
  function goToHit(hit: SearchHit) {
    setSearchOpen(false)
    if (hit.kind === 'entry' && hit.section) {
      setView(hit.section)
      return
    }
    if (!hit.objectionId) return
    setObjectionId(hit.objectionId)
    setStageId(hit.stageId)
    setView('objections')
  }

  function handleLogout() {
    goHome()
    void signOut()
  }

  return (
    // Запрет копирования настроен глобально (main.tsx + index.css) на весь сайт.
    <div className="min-h-dvh">
      <Header
        lang={lang}
        languages={langOptions}
        onLangChange={setLang}
        onLogout={handleLogout}
        onHome={goHome}
        onSearch={configured ? () => setSearchOpen(true) : undefined}
      />

      {searchOpen && (
        <SearchOverlay
          lang={lang}
          onClose={() => setSearchOpen(false)}
          onGo={goToHit}
        />
      )}

      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
        {view === 'home' && (
          <>
            <WhatsNew
              lang={lang}
              enabled={configured && !!session}
              onGo={(o, st) => {
                setObjectionId(o)
                setStageId(st)
                setView('objections')
              }}
            />
            <HomeScreen lang={lang} onSelect={(choice) => setView(choice)} />
          </>
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
            agentEmail={session?.user?.email ?? null}
            trackViews={configured && !!session}
          />
        )}

        {view !== 'home' && view !== 'objections' && (
          // key={view} — чистый ремоунт при смене раздела: внутреннее
          // состояние (открытый элемент) не «протекает» между разделами.
          <SectionScreen
            key={view}
            lang={lang}
            section={view}
            titleKey={SECTION_TITLE[view]}
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
  agentEmail,
  trackViews,
}: {
  lang: Lang
  content: ReturnType<typeof useContent>
  objectionId: string | null
  stageId: string | null
  setObjectionId: (id: string | null) => void
  setStageId: (id: string | null) => void
  loadRebuttal: (o: string, s: string) => Promise<Rebuttal | null>
  agentEmail: string | null
  /** В фолбэк-режиме (без Supabase) писать статистику некуда. */
  trackViews: boolean
}) {
  const { objections, stages, rebuttalIndex } = content
  const { isFavorite, toggleFavorite } = useFavorites()
  const { tags, objectionsWithTag } = useTags()
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Языковой фильтр: только переведённые на выбранный язык.
  const byLang = objections.filter((o) =>
    hasTranslated(o.label, lang, o.draftLangs),
  )

  // Фильтр по тегу применяется только к списку на первом шаге: уже
  // выбранное возражение из-за смены чипа исчезать не должно.
  const tagged = activeTag ? objectionsWithTag(activeTag) : null
  const visibleObjections = tagged ? byLang.filter((o) => tagged.has(o.id)) : byLang

  // Выбор и шаг считаем по ОТФИЛЬТРОВАННЫМ спискам: если активный выбор не
  // переведён на текущий язык, он просто «не существует» → шаг откатывается,
  // и мы не показываем чужой fallback-текст и не зависаем на пустом шаге 3.
  const objection = byLang.find((o) => o.id === objectionId)

  // Этапы: язык + наличие скрипта под выбранное возражение. Без этого агент
  // видел бы все три этапа и в ~2 случаях из 3 упирался в «скрипт не найден».
  // Пустой индекс (фолбэк/ошибка загрузки) = не фильтруем, показываем всё.
  const visibleStages = stages.filter((s) => {
    if (!hasLang(s.label, lang)) return false
    if (!objection || rebuttalIndex.length === 0) return true
    return rebuttalIndex.some(
      (e) =>
        e.objectionId === objection.id &&
        e.stageId === s.id &&
        e.langs.includes(lang),
    )
  })

  const stage = visibleStages.find((s) => s.id === stageId)
  const step: 1 | 2 | 3 = !objection ? 1 : !stage ? 2 : 3

  // Esc — шаг назад. Вместе с цифрами 1–9 на карточках это даёт проход
  // по всему сценарию, не снимая рук с клавиатуры во время звонка.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (step === 3) setStageId(null)
      else if (step === 2) {
        setObjectionId(null)
        setStageId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, setObjectionId, setStageId])

  return (
    <>
      <Stepper
        active={step}
        crumbs={[
          {
            label: objection
              ? pick(objection.label, lang)
              : t('stepperObjection', lang),
            onClick: () => {
              setObjectionId(null)
              setStageId(null)
            },
          },
          {
            label: stage ? pick(stage.label, lang) : t('stepperStage', lang),
            onClick: () => setStageId(null),
          },
          { label: t('stepperAnswer', lang) },
        ]}
      />

      {content.loading && <Notice>{t('loading', lang)}</Notice>}
      {content.error && <RetryNotice lang={lang} />}
      {!content.loading &&
        !content.error &&
        byLang.length === 0 && <Notice>{t('noEntries', lang)}</Notice>}

      {!content.loading && !content.error && byLang.length > 0 && (
        <>
          {step === 1 && (
            <SelectScreen
              lang={lang}
              stepLabel={`${t('step', lang)} 1`}
              title={t('step1Title', lang)}
              columns={2}
              searchable
              filters={
                tags.length > 0 ? (
                  <TagChips
                    lang={lang}
                    tags={tags}
                    active={activeTag}
                    onChange={setActiveTag}
                  />
                ) : null
              }
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              items={visibleObjections.map((o) => ({
                id: o.id,
                label: pick(o.label, lang),
                hint: pick(o.hint, lang),
              }))}
              onSelect={(id) => setObjectionId(id)}
            />
          )}

          {step === 2 && visibleStages.length === 0 && (
            <Notice>{t('noStages', lang)}</Notice>
          )}

          {step === 2 && visibleStages.length > 0 && (
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
              agentEmail={agentEmail}
              trackViews={trackViews}
            />
          )}
        </>
      )}
    </>
  )
}

/** Полоска тегов над списком возражений. */
function TagChips({
  lang,
  tags,
  active,
  onChange,
}: {
  lang: Lang
  tags: { id: string; label: Localized }[]
  active: string | null
  onChange: (id: string | null) => void
}) {
  // Тег без названия на текущем языке для оператора не существует.
  const shown = tags.filter((t) => hasLang(t.label, lang))
  if (shown.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Chip active={active === null} onClick={() => onChange(null)}>
        {t('allTags', lang)}
      </Chip>
      {shown.map((tag) => (
        <Chip
          key={tag.id}
          active={active === tag.id}
          onClick={() => onChange(active === tag.id ? null : tag.id)}
        >
          {pick(tag.label, lang)}
        </Chip>
      ))}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent'
      }`}
    >
      {children}
    </button>
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

/** Сообщение об ошибке загрузки с кнопкой повторной попытки. */
function RetryNotice({ lang }: { lang: Lang }) {
  return (
    <Notice tone="error">
      {t('loadError', lang)}{' '}
      <button
        onClick={() => location.reload()}
        className="font-semibold underline underline-offset-2 hover:text-red-700"
      >
        {t('refresh', lang)}
      </button>
    </Notice>
  )
}

function AnswerWrap({
  lang,
  objectionId,
  stageId,
  objectionLabel,
  stageLabel,
  loadRebuttal,
  agentEmail,
  trackViews,
}: {
  lang: Lang
  objectionId: string
  stageId: string
  objectionLabel: string
  stageLabel: string
  loadRebuttal: (o: string, s: string) => Promise<Rebuttal | null>
  agentEmail: string | null
  trackViews: boolean
}) {
  const [rebuttal, setRebuttal] = useState<Rebuttal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const note = useNote({ agentEmail, objectionId, stageId, enabled: trackViews })

  // Отметка исхода разговора — тот же контекст, что и у статистики открытий.
  const { picked, pick: markOutcome } = useOutcome({
    objectionId,
    stageId,
    lang,
    agentEmail,
    enabled: trackViews,
  })

  const key = useMemo(() => `${objectionId}:${stageId}`, [objectionId, stageId])

  // Статистика открытий: одна запись на пару «возражение × этап × язык».
  // Пишем «в фоне» и молча глотаем ошибку — телеметрия не должна мешать
  // оператору работать во время звонка.
  useEffect(() => {
    if (!trackViews) return
    void logScriptView({ objectionId, stageId, lang, agentEmail }).catch(
      () => {},
    )
  }, [objectionId, stageId, lang, agentEmail, trackViews])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    withTimeout(loadRebuttal(objectionId, stageId))
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
  if (error) return <RetryNotice lang={lang} />
  // Черновики видны только в админке; агенту они «не существуют».
  // Языковой фильтр: ответ показываем только если он есть на выбранном языке.
  if (
    !rebuttal ||
    rebuttal.draft ||
    !hasTranslated(rebuttal.answer, lang, rebuttal.draftLangs)
  )
    return <Notice>{t('noScript', lang)}</Notice>

  return (
    <AnswerScreen
      lang={lang}
      objectionLabel={objectionLabel}
      stageLabel={stageLabel}
      rebuttal={rebuttal}
      note={
        note.available && note.loaded ? (
          <NotePanel
            lang={lang}
            body={note.body}
            saving={note.saving}
            error={note.error}
            onSave={note.save}
          />
        ) : null
      }
      outcome={picked}
      // Без базы и без входа отметку писать некуда — прячем строку целиком.
      onOutcome={trackViews ? markOutcome : undefined}
    />
  )
}
