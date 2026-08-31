import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { LogoMark } from '../components/Logo'
import { ProfileMenu } from '../components/ProfileMenu'
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

/** Разделы, сгруппированные по смыслу: вертикальный список не упирается
 * в ширину экрана и не требует прокрутки, как прежний ряд вкладок. */
const GROUPS: { title: string; ids: Tab[] }[] = [
  { title: 'Контент', ids: ['objections', 'stages', 'rebuttals', 'tags'] },
  { title: 'Материалы', ids: ['presentation', 'service', 'market'] },
  { title: 'Отчёты', ids: ['analytics', 'feedback', 'freshness'] },
  { title: 'Настройки', ids: ['languages', 'agents', 'import'] },
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
    <Dashboard
      onSignOut={auth.signOut}
      readOnly={auth.role === 'supervisor'}
      email={auth.session.user.email ?? null}
    />
  )
}

function Dashboard({
  onSignOut,
  readOnly,
  email,
}: {
  onSignOut: () => void
  /** Супервайзер: отчёты видит, контент не трогает. */
  readOnly: boolean
  email: string | null
}) {
  const [tab, setTab] = useState<Tab>(readOnly ? 'analytics' : 'languages')
  // Вкладку редактирования супервайзеру открывать незачем: там его
  // встретит отказ базы, а не форма.
  useEffect(() => {
    if (readOnly && !SUPERVISOR_TABS.includes(tab)) setTab('analytics')
  }, [readOnly, tab])

  // Супервайзеру показываем только отчёты — группы фильтруются целиком,
  // пустые не рисуются.
  const visibleGroups = GROUPS.map((g) => ({
    ...g,
    ids: readOnly ? g.ids.filter((id) => SUPERVISOR_TABS.includes(id)) : g.ids,
  })).filter((g) => g.ids.length > 0)

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} id="admin" />
            <div className="text-base font-semibold tracking-tight text-ink">
              Convvy{' '}
              <span className="font-normal text-ink-3">
                {readOnly ? 'Отчёты' : 'Admin'}
              </span>
            </div>
          </div>
          <ProfileMenu
            email={email}
            subtitle={readOnly ? 'Супервайзер · только отчёты' : 'Администратор'}
            items={[
              {
                label: 'Приложение оператора',
                href: '/',
                icon: <IconExternal size={16} />,
              },
              { label: 'Выйти', onClick: onSignOut, danger: true },
            ]}
          />
        </div>
        {/* Узкий экран: список разделов складывается в один селект. */}
        <div className="px-4 pb-3 md:hidden">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            aria-label="Раздел"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-2 outline-none focus:border-accent focus:ring-4 focus:ring-accent/12"
          >
            {visibleGroups.map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.ids.map((id) => (
                  <option key={id} value={id}>
                    {TABS.find((t) => t.id === id)?.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div aria-hidden className="h-px w-full bg-line" />

      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* Боковое меню: вертикальный список не упирается в ширину и не
            требует прокрутки, в отличие от прежнего ряда вкладок. */}
        <nav className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-24 flex flex-col gap-5">
            {visibleGroups.map((g) => (
              <div key={g.title}>
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  {g.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {g.ids.map((id) => {
                    const label = TABS.find((t) => t.id === id)?.label ?? id
                    const active = tab === id
                    return (
                      <li key={id}>
                        <button
                          onClick={() => setTab(id)}
                          aria-current={active ? 'page' : undefined}
                          className={`relative w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors duration-200 ${
                            active
                              ? 'bg-accent-soft font-medium text-accent'
                              : 'text-ink-2 hover:bg-panel hover:text-ink'
                          }`}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="brand-rule absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                            />
                          )}
                          {label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          {CONTENT_TABS.includes(tab) && data.languages.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2">
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
        )}

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
