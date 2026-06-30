import { useMemo, useState } from 'react'
import type { Lang, SectionId } from '../types'
import { hasLang, pick, t, type UiKey } from '../i18n/ui'
import { useEntries } from '../hooks/useEntries'

interface Props {
  lang: Lang
  section: SectionId
  /** Ключ заголовка раздела (navPresentations / navServices / navMarket). */
  titleKey: UiKey
  /** Назад на главную (к 4 плиткам). */
  onHome: () => void
}

export function SectionScreen({ lang, section, titleKey, onHome }: Props) {
  const { loading, error, entries } = useEntries(section)
  const [openId, setOpenId] = useState<string | null>(null)

  // Языковой фильтр: показываем только элементы с заголовком на выбранном языке.
  const visible = useMemo(
    () => entries.filter((e) => hasLang(e.title, lang)),
    [entries, lang],
  )
  const open = visible.find((e) => e.id === openId) ?? null

  const sectionTitle = t(titleKey, lang)

  return (
    <div className="fade-in">
      <Breadcrumb
        lang={lang}
        sectionTitle={sectionTitle}
        leaf={open ? pick(open.title, lang) : undefined}
        onHome={onHome}
        onSection={open ? () => setOpenId(null) : undefined}
      />

      {loading && <Notice>{t('loading', lang)}</Notice>}
      {error && <Notice tone="error">{t('loadError', lang)}</Notice>}

      {!loading && !error && open && (
        <article>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {pick(open.title, lang)}
          </h1>
          <CopyCard lang={lang} text={pick(open.body, lang)} />
        </article>
      )}

      {!loading && !error && !open && (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {sectionTitle}
          </h1>
          {visible.length === 0 ? (
            <Notice>{t('noEntries', lang)}</Notice>
          ) : (
            <ul className="mt-6 space-y-3">
              {visible.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setOpenId(e.id)}
                    className="card card-hover group flex w-full items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-accent sm:p-5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-lg font-semibold leading-snug text-slate-900">
                        {pick(e.title, lang)}
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {pick(e.body, lang)}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent"
                    >
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function Breadcrumb({
  lang,
  sectionTitle,
  leaf,
  onHome,
  onSection,
}: {
  lang: Lang
  sectionTitle: string
  leaf?: string
  onHome: () => void
  onSection?: () => void
}) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500">
      <button onClick={onHome} className="hover:text-slate-900 hover:underline">
        {t('home', lang)}
      </button>
      <span aria-hidden className="text-slate-300">
        ›
      </span>
      {leaf ? (
        <button
          onClick={onSection}
          className="hover:text-slate-900 hover:underline"
        >
          {sectionTitle}
        </button>
      ) : (
        <span className="font-medium text-slate-900">{sectionTitle}</span>
      )}
      {leaf && (
        <>
          <span aria-hidden className="text-slate-300">
            ›
          </span>
          <span className="font-medium text-slate-900">{leaf}</span>
        </>
      )}
    </nav>
  )
}

function CopyCard({ lang, text }: { lang: Lang; text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard недоступен — игнорируем */
    }
  }

  return (
    <div className="relative mt-5 whitespace-pre-line rounded-lg border border-accent/30 bg-accent-soft p-4 pr-24 text-[15px] leading-relaxed text-slate-900">
      {text}
      <button
        onClick={copy}
        aria-label={t('copy', lang)}
        className={`absolute right-2.5 top-2.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
          copied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-white text-slate-500 hover:border-accent hover:text-accent'
        }`}
      >
        {copied ? `✓ ${t('copied', lang)}` : t('copy', lang)}
      </button>
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
      className={`mt-6 rounded-lg border px-4 py-6 text-center text-sm ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      {children}
    </p>
  )
}
