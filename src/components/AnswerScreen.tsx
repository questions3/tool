import type { Lang, Outcome, Rebuttal } from '../types'
import { hasLang, pick, t } from '../i18n/ui'

interface Props {
  lang: Lang
  objectionLabel: string
  stageLabel: string
  rebuttal: Rebuttal
  /** Отмеченный исход разговора; null — оператор ещё не отмечал. */
  outcome?: Outcome | null
  /**
   * Обработчик отметки. Не передан — строка исхода не показывается:
   * так экран остаётся чистым в предпросмотре админки.
   */
  onOutcome?: (outcome: Outcome | null) => void
  /**
   * Личная заметка оператора. Слот, а не данные: экран остаётся без
   * связи с базой и годится для предпросмотра в админке.
   */
  note?: React.ReactNode
}

export function AnswerScreen({
  lang,
  objectionLabel,
  stageLabel,
  rebuttal,
  outcome = null,
  onOutcome,
  note,
}: Props) {
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

      {note}

      {onOutcome && (
        <OutcomeBar lang={lang} outcome={outcome} onPick={onOutcome} />
      )}
    </div>
  )
}

/**
 * Необязательная отметка исхода разговора.
 *
 * Стоит в самом низу: оператор доходит до неё, когда разговор уже кончился.
 * Пропуск ничего не ломает — обязаловка в конце звонка дала бы мусор.
 */
function OutcomeBar({
  lang,
  outcome,
  onPick,
}: {
  lang: Lang
  outcome: Outcome | null
  onPick: (outcome: Outcome | null) => void
}) {
  const options = [
    { key: 'success', label: t('outcomeSuccess', lang), tone: 'emerald' },
    { key: 'callback', label: t('outcomeCallback', lang), tone: 'amber' },
    { key: 'lost', label: t('outcomeLost', lang), tone: 'rose' },
  ] as const

  if (outcome) {
    const chosen = options.find((o) => o.key === outcome)
    return (
      <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 pt-4 text-sm">
        <span className="font-medium text-slate-900">
          <span aria-hidden className="text-emerald-600">
            ✓
          </span>{' '}
          {t('outcomeSaved', lang)}: {chosen?.label}
        </span>
        <button
          onClick={() => onPick(null)}
          className="rounded text-slate-400 underline underline-offset-2 transition hover:text-slate-600"
        >
          {t('outcomeUndo', lang)}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-4">
      <span className="text-sm text-slate-400">{t('outcomeAsk', lang)}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            className={`rounded-full border px-3 py-1 text-sm transition ${TONES[o.tone]}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Классы вынесены целиком: Tailwind не видит имена, собранные из кусков.
const TONES = {
  emerald:
    'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
  amber:
    'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
  rose: 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
} as const

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
