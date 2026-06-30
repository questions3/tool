import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useAdminData } from './useAdminData'
import { AdminLogin } from './AdminLogin'
import { LanguagesSection } from './sections/LanguagesSection'
import { ObjectionsSection } from './sections/ObjectionsSection'
import { StagesSection } from './sections/StagesSection'
import { RebuttalsSection } from './sections/RebuttalsSection'
import { AgentsSection } from './sections/AgentsSection'
import { EntriesSection } from './sections/EntriesSection'
import { ConfirmProvider } from './components/Confirm'

type Tab =
  | 'languages'
  | 'objections'
  | 'stages'
  | 'rebuttals'
  | 'presentation'
  | 'service'
  | 'market'
  | 'agents'

const TABS: { id: Tab; label: string }[] = [
  { id: 'languages', label: 'Языки' },
  { id: 'objections', label: 'Возражения' },
  { id: 'stages', label: 'Этапы' },
  { id: 'rebuttals', label: 'Скрипты' },
  { id: 'presentation', label: 'Презентации' },
  { id: 'service', label: 'Сервисы' },
  { id: 'market', label: 'Рынок' },
  { id: 'agents', label: 'Агенты' },
]

/** Вкладки с локализованным контентом — для них показываем «Язык заполнения». */
const CONTENT_TABS: Tab[] = [
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
        <h1 className="text-xl font-bold text-slate-900">Supabase не настроен</h1>
        <p className="mt-2 text-sm text-slate-600">
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
        <h1 className="text-xl font-bold text-slate-900">Нет прав доступа</h1>
        <p className="mt-2 text-sm text-slate-600">
          Вы вошли как <b>{auth.session.user.email}</b>, но у этого аккаунта нет
          прав администратора. Добавьте пользователя в таблицу <code>admins</code>{' '}
          в Supabase.
        </p>
        <button
          onClick={() => auth.signOut()}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Выйти
        </button>
        <BackLink />
      </CenterCard>
    )
  }

  return <Dashboard email={auth.session.user.email ?? ''} onSignOut={auth.signOut} />
}

function Dashboard({
  email,
  onSignOut,
}: {
  email: string
  onSignOut: () => void
}) {
  const [tab, setTab] = useState<Tab>('languages')
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
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white">
              C
            </span>
            <div className="text-base font-semibold text-slate-900">
              Convvy Admin
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-slate-500 hover:text-slate-900">
              ↗ Приложение
            </a>
            <span className="hidden text-sm text-slate-400 sm:inline">{email}</span>
            <button
              onClick={onSignOut}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {TABS.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.label}
              </option>
            ))}
          </select>
        </div>
        {/* Десктоп: ряд вкладок */}
        <nav className="mx-auto hidden max-w-4xl flex-wrap gap-x-1 px-4 sm:flex sm:px-6">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === tb.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </nav>

        {CONTENT_TABS.includes(tab) && data.languages.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/70">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 px-4 py-2 sm:px-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Язык заполнения
              </span>
              {data.languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setActiveLang(l.code)}
                  title={l.name}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                    activeLang === l.code
                      ? 'bg-accent text-white'
                      : 'border border-slate-200 bg-white text-slate-500 hover:text-slate-900'
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
        {data.loading && <p className="text-sm text-slate-500">Загрузка данных…</p>}
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center">
        {children}
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <p className="mt-4 text-center text-xs text-slate-400">
      <a href="/" className="hover:text-slate-600">
        ← Вернуться в приложение
      </a>
    </p>
  )
}
