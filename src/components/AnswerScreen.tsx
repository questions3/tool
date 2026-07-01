import type { Lang, Rebuttal } from '../types'
import { hasLang, pick, t } from '../i18n/ui'

interface Props {
  lang: Lang
  objectionLabel: string
  stageLabel: string
  rebuttal: Rebuttal
}

export function AnswerScreen({ lang, objectionLabel, stageLabel, rebuttal }: Props) {
  // Языковой фильтр: показываем только ветки, переведённые на выбранный язык.
  const branches = rebuttal.branches.filter((b) => hasLang(b.response, lang))
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
        <ScriptCard text={pick(rebuttal.answer, lang)} prominent />
      </section>

      {/* Ветви what-if — условие вынесено в заголовок ветки */}
      {branches.length > 0 && (
        <section className="mt-8">
          <SectionTitle>{t('whatIf', lang)}</SectionTitle>
          <div className="mt-3 space-y-3">
            {branches.map((b, i) => (
              <div
                key={i}
                className="card rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  {pick(b.label, lang)} · {t('condition', lang)}
                </div>
                <div className="mt-1 text-base font-semibold leading-snug text-slate-900">
                  {pick(b.condition, lang)}
                </div>
                <div className="mt-3">
                  <ScriptCard text={pick(b.response, lang)} />
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
  text,
  prominent = false,
}: {
  text: string
  prominent?: boolean
}) {
  // Базовый ответ — крупная выделенная карточка.
  if (prominent) {
    return (
      <div className="mt-3 whitespace-pre-line rounded-lg border border-accent/30 bg-accent-soft p-4 text-[15px] leading-relaxed text-slate-900">
        {text}
      </div>
    )
  }

  // Ответ ветки.
  return (
    <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
      {text}
    </div>
  )
}
