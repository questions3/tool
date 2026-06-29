import { useState } from 'react'
import type { Lang, Rebuttal } from '../types'
import { t } from '../i18n/ui'

interface Props {
  lang: Lang
  objectionLabel: string
  stageLabel: string
  rebuttal: Rebuttal
}

export function AnswerScreen({ lang, objectionLabel, stageLabel, rebuttal }: Props) {
  return (
    <div className="fade-in">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {t('step3Title', lang)}
      </p>
      <h1 className="mt-1.5 flex flex-wrap items-center gap-x-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {objectionLabel}
        <span aria-hidden className="text-slate-300">
          /
        </span>
        <span className="text-slate-400">{stageLabel}</span>
      </h1>

      {rebuttal.draft && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span aria-hidden className="mt-0.5 text-amber-500">
            ⚠
          </span>
          <div>
            <div className="font-semibold text-amber-800">
              {t('draftBadge', lang)}
            </div>
            <div className="mt-0.5 text-amber-700">{t('draftNote', lang)}</div>
          </div>
        </div>
      )}

      {/* Базовый скрипт */}
      <section className="mt-6">
        <SectionTitle>{t('baseAnswer', lang)}</SectionTitle>
        <ScriptCard lang={lang} text={rebuttal.answer[lang]} accent />
      </section>

      {/* Ветви what-if */}
      {rebuttal.branches.length > 0 && (
        <section className="mt-8">
          <SectionTitle>{t('whatIf', lang)}</SectionTitle>
          <div className="mt-3 space-y-3">
            {rebuttal.branches.map((b, i) => (
              <div
                key={i}
                className="card rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-base font-semibold text-accent">
                    {b.label[lang]}
                  </span>
                  <span className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {t('condition', lang)}:
                    </span>{' '}
                    {b.condition[lang]}
                  </span>
                </div>
                <div className="mt-3">
                  <ScriptCard lang={lang} text={b.response[lang]} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  )
}

function ScriptCard({
  lang,
  text,
  accent = false,
}: {
  lang: Lang
  text: string
  accent?: boolean
}) {
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
    <div
      className={`relative rounded-lg border p-4 pr-24 leading-relaxed ${
        accent
          ? 'mt-3 border-accent/30 bg-accent-soft text-[15px] text-slate-900'
          : 'border-slate-200 bg-slate-50 text-sm text-slate-700'
      }`}
    >
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
