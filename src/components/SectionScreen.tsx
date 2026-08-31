import { useMemo, useState } from 'react'
import type { Lang, SectionId } from '../types'
import { hasLang, pick, t, type UiKey } from '../i18n/ui'
import { useEntries } from '../hooks/useEntries'
import { Stepper } from './Stepper'
import { IconArrowRight } from './icons'

interface Props {
  lang: Lang
  section: SectionId
  /** Ключ заголовка раздела (navPresentations / navServices / navMarket). */
  titleKey: UiKey
}

export function SectionScreen({ lang, section, titleKey }: Props) {
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
      <Stepper
        active={open ? 2 : 1}
        crumbs={
          open
            ? [
                { label: sectionTitle, onClick: () => setOpenId(null) },
                { label: pick(open.title, lang) },
              ]
            : [{ label: sectionTitle }]
        }
      />

      {loading && <Notice>{t('loading', lang)}</Notice>}
      {error && (
        <Notice tone="error">
          {t('loadError', lang)}{' '}
          <button
            onClick={() => location.reload()}
            className="font-semibold underline underline-offset-2 hover:text-red-700"
          >
            {t('refresh', lang)}
          </button>
        </Notice>
      )}

      {!loading && !error && open && (
        <ContentCard text={pick(open.body, lang)} />
      )}

      {!loading && !error && !open && (
        <>
          {visible.length === 0 ? (
            <Notice>{t('noEntries', lang)}</Notice>
          ) : (
            <ul className="space-y-3">
              {visible.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setOpenId(e.id)}
                    className="card card-hover group flex w-full items-start gap-3.5 rounded-xl border border-line bg-white p-4 text-left transition hover:border-accent sm:p-5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-lg font-semibold leading-snug text-ink">
                        {pick(e.title, lang)}
                      </span>
                      <span className="mt-1 line-clamp-2 text-sm text-ink-3">
                        {pick(e.body, lang)}
                      </span>
                    </span>
                    <IconArrowRight
                      size={18}
                      className="mt-0.5 shrink-0 text-line-strong transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
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

function ContentCard({ text }: { text: string }) {
  return (
    <div className="mt-5 whitespace-pre-line rounded-lg border border-accent/30 bg-accent-soft p-4 text-[15px] leading-relaxed text-ink">
      {text}
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
          : 'border-line bg-white text-ink-3'
      }`}
    >
      {children}
    </p>
  )
}
