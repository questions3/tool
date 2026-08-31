import { useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { LogoMark } from '../components/Logo'
import { IconExternal } from '../components/icons'
import { useAdminData } from './useAdminData'
import { AdminLogin } from './AdminLogin'
import { LanguagesSection } from './sections/LanguagesSection'
import { ObjectionsSection } from './sections/ObjectionsSection'
import { StagesSection } from './sections/StagesSection'
import { RebuttalsSection } from './sections/RebuttalsSection'
import { AgentsSection } from './sections/AgentsSection'
import { EntriesSection } from './sections/EntriesSection'
import { AnalyticsSection } from './sections/AnalyticsSection'
import { TagsSection } from './sections/TagsSection'
import { ExportSection } from './sections/ExportSection'
import { FeedbackSection } from './sections/FeedbackSection'
import { FreshnessSection } from './sections/FreshnessSection'
import { ImportSection } from './sections/ImportSection'
import { ConfirmProvider } from './components/Confirm'

type Tab =
  | 'languages'
  | 'objections'
  | 'stages'
  | 'rebuttals'
  | 'presentation'
  | 'service'
  | 'market'
  | 'tags'
  | 'feedback'
  | 'freshness'
  | 'agents'
  | 'analytics'
  | 'import'

const TABS: { id: Tab; label: string }[] = [
  { id: 'languages', label: 'Языки' },
  { id: 'objections', label: 'Возражения' },
  { id: 'stages', label: 'Этапы' },
  { id: 'rebuttals', label: 'Скрипты' },
  { id: 'presentation', label: 'Презентации' },
  { id: 'service', label: 'Сервисы' },
  { id: 'market', label: 'Рынок' },
  { id: 'tags', label: 'Теги' },
  { id: 'feedback', label: 'Обратная связь' },
  { id: 'freshness', label: 'Актуальность' },
  { id: 'agents', label: 'Агенты' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'import', label: 'Импорт и экспорт' },
]

/**
 * Что видит супервайзер. Руководителю группы нужны цифры, но не нужна
 * кнопка «удалить», поэтому вкладки редактирования ему просто не
 * показываются. Настоящий запрет живёт в политиках БД — это лишь чтобы
 * он не упирался в отказ там, где всё равно ничего не сможет.
 */
const SUPERVISOR_TABS: Tab[] = ['analytics', 'feedback', 'freshness']

/** Вкладки с локализованным контентом — для них показываем «Язык заполнения». */
const CONTENT_TABS: Tab[] = [
  'import',
  'tags',
  'objections',
  'stages',
  'rebuttals',
  'presentation',
  'service',
  'market',
]

const LANG_KEY = 'convvy.admin.lang'

export default function AdminApp() {
  const auth = useAdminAuth()

  if (!isSupabaseConfigured) {
    return (
      <CenterCard>
        <h1 className="text-xl font-bold text-ink">Supabase не настроен</h1>
        <p className="mt-2 text-sm text-ink-2">
          Задайте переменные <code>VITE_SUPABASE_URL</code> и{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> в окружении (Netlify → Environment
          variables) и пересоберите проект.
        </p>
        <BackLink />
      </CenterCard>
    )
  }

  if (auth.loading) {
    return <CenterCard>Загрузка…</CenterCard>
  }

  if (!auth.session) {
    return <AdminLogin signIn={auth.signIn} error={auth.error} />
  }

  if (!auth.isAdmin) {
    return (
      <CenterCard>
        <h1 className="text-xl font-bold text-ink">Нет прав доступа</h1>
        <p className="mt-2 text-sm text-ink-2">
          Вы вошли как <b>{auth.session.user.email}</b>, но у этого аккаунта нет
          прав администратора. Добавьте пользователя в таблицу <code>admins</code>{' '}
          в Supabase.
        </p>
        <button
          onClick={() => auth.signOut()}
          className="mt-4 rounded-lg border border-line-strong px-4 py-2 text-sm text-ink-2 hover:bg-canvas"
        >
          Выйти
        </button>
        <BackLink />
      </CenterCard>
    )
  }

  return (
    <Dashboard onSignOut={auth.signOut} readOnly={auth.role === 'supervisor'} />
  )
}

function Dashboard({
  onSignOut,
  readOnly,
}: {
  onSignOut: () => void
  /** Супервайзер: отчёты видит, контент не трогает. */
  readOnly: boolean
}) {
  const [tab, setTab] = useState<Tab>(readOnly ? 'analytics' : 'languages')
  // Вкладку редактирования супервайзеру открывать незачем: там его
  // встретит отказ базы, а не форма.
  useEffect(() => {
    if (readOnly && !SUPERVISOR_TABS.includes(tab)) setTab('analytics')
  }, [readOnly, tab])

  const [activeLang, setActiveLang] = useState<string>(
    () => localStorage.getItem(LANG_KEY) ?? 'ru',
  )
  const data = useAdminData()

  useEffect(() => {
    localStorage.setItem(LANG_KEY, activeLang)
  }, [activeLang])

  // Активный язык всегда должен быть среди доступных.
  useEffect(() => {
    if (data.languages.length && !data.languages.some((l) => l.code === activeLang)) {
      setActiveLang(data.languages[0].code)
    }
  }, [data.languages, activeLang])

  return (
    <ConfirmProvider>
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} id="admin" />
            <div className="text-base font-semibold tracking-tight text-ink">
              Convvy{' '}
              <span className="font-normal text-ink-3">
                {readOnly ? 'Отчёты' : 'Admin'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-md text-sm text-ink-3 transition-colors duration-200 hover:text-accent"
            >
              <IconExternal size={15} />
              Приложение
            </a>
            <button
              onClick={onSignOut}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-canvas"
            >
              Выйти
            </button>
          </div>
        </div>
        {/* Мобильные: компактный селект вместо рваного переноса вкладок */}
        <div className="px-4 pb-2 sm:hidden">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-2 outline-none focus:border-accent focus:ring-4 focus:ring-accent/12"
          >
            {(readOnly
              ? SUPERVISOR_TABS.map((id) => TABS.find((t) => t.id === id)!)
              : TABS
            ).map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.label}
              </option>
            ))}
          </select>
        </div>
        {/* Десктоп: ряд вкладок */}
        <TabBar tab={tab} onSelect={setTab} readOnly={readOnly} />
        <div aria-hidden className="h-px w-full bg-line" />

        {CONTENT_TABS.includes(tab) && data.languages.length > 0 && (
          <div className="bg-panel/60">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 px-4 py-2 sm:px-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Язык заполнения
              </span>
              {data.languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setActiveLang(l.code)}
                  title={l.name}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                    activeLang === l.code
                      ? 'brand-fill text-white shadow-[0_2px_8px_-2px_rgba(87,65,248,0.5)]'
                      : 'border border-line bg-white text-ink-3 hover:border-accent-line hover:text-accent'
                  }`}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {data.loading && <p className="text-sm text-ink-3">Загрузка данных…</p>}
        {data.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Ошибка: {data.error}
          </p>
        )}
        {!data.loading && !data.error && (
          <>
            {tab === 'languages' && (
              <LanguagesSection languages={data.languages} onChanged={data.reload} />
            )}
            {tab === 'objections' && (
              <ObjectionsSection
                lang={activeLang}
                languages={data.languages}
                objections={data.objections}
                onChanged={data.reload}
              />
            )}
            {tab === 'stages' && (
              <StagesSection
                lang={activeLang}
                languages={data.languages}
                stages={data.stages}
                onChanged={data.reload}
              />
            )}
            {tab === 'rebuttals' && (
              <RebuttalsSection
                lang={activeLang}
                languages={data.languages}
                objections={data.objections}
                stages={data.stages}
                rebuttals={data.rebuttals}
                onChanged={data.reload}
              />
            )}
            {tab === 'presentation' && (
              <EntriesSection
                section="presentation"
                title="Презентации"
                lang={activeLang}
                languages={data.languages}
              />
            )}
            {tab === 'service' && (
              <EntriesSection
                section="service"
                title="Сервисы"
                lang={activeLang}
                languages={data.languages}
              />
            )}
            {tab === 'market' && (
              <EntriesSection
                section="market"
                title="Рынок"
                lang={activeLang}
                languages={data.languages}
              />
            )}
            {tab === 'agents' && (
              <AgentsSection
                agentEmails={data.agentEmails}
                onChanged={data.reload}
              />
            )}
            {tab === 'tags' && (
              <TagsSection
                lang={activeLang}
                languages={data.languages}
                objections={data.objections}
              />
            )}
            {tab === 'feedback' && (
              <FeedbackSection lang={activeLang} readOnly={readOnly} />
            )}
            {tab === 'freshness' && (
              <FreshnessSection lang={activeLang} readOnly={readOnly} />
            )}
            {tab === 'analytics' && <AnalyticsSection lang={activeLang} />}
            {tab === 'import' && (
              <div className="flex flex-col gap-6">
                <ImportSection
                  lang={activeLang}
                  languages={data.languages}
                  objections={data.objections}
                  stages={data.stages}
                  onChanged={data.reload}
                />
                <ExportSection
                  languages={data.languages}
                  objections={data.objections}
                  stages={data.stages}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </ConfirmProvider>
  )
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center">
        {children}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <p className="mt-4 text-center text-xs text-ink-3">
      <a href="/" className="hover:text-ink-2">
        ← Вернуться в приложение
      </a>
    </p>
  )
}

/**
 * Ряд вкладок админки.
 *
 * Разделов двенадцать, и в два рваных ряда они читались плохо. Одна
 * прокручиваемая строка держит порядок, но обрезанная вкладка у края
 * выглядит как ошибка вёрстки, а не как «есть ещё» — поэтому край
 * затеняется ровно тогда, когда прокрутка действительно есть.
 */
function TabBar({
  tab,
  onSelect,
  readOnly,
}: {
  tab: Tab
  onSelect: (t: Tab) => void
  readOnly: boolean
}) {
  const tabs = readOnly
    ? SUPERVISOR_TABS.map((id) => TABS.find((t) => t.id === id)!).filter(Boolean)
    : TABS
  const ref = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  // Активная вкладка не должна оставаться за краем после перезагрузки.
  useEffect(() => {
    ref.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tab])

  return (
    <div className="relative mx-auto hidden max-w-4xl sm:block">
      <nav
        ref={ref}
        className="flex gap-x-1 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => onSelect(tb.id)}
            aria-current={tab === tb.id ? 'page' : undefined}
            className={`relative -mb-px shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              tab === tb.id ? 'text-accent' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {tb.label}
            {tab === tb.id && (
              <span
                aria-hidden
                className="brand-rule absolute inset-x-2 bottom-0 h-[2px] rounded-full"
              />
            )}
          </button>
        ))}
      </nav>
      {edges.left && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent"
        />
      )}
      {edges.right && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent"
        />
      )}
    </div>
  )
}
