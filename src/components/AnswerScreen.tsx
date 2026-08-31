import type { Lang, Outcome, Rebuttal } from '../types'
import { hasLang, pick, t } from '../i18n/ui'
import { IconCheck, IconClock, IconSlash, IconTarget } from './icons'

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
  /** Оценка скрипта. Слот — по той же причине, что и заметка. */
  feedback?: React.ReactNode
}

export function AnswerScreen({
  lang,
  objectionLabel,
  stageLabel,
  rebuttal,
  outcome = null,
  onOutcome,
  note,
  feedback,
}: Props) {
  // Языковой фильтр: показываем только ветки, переведённые на выбранный язык.
  const branches = rebuttal.branches.filter((b) => hasLang(b.response, lang))
  return (
    <div className="fade-in">
      <h1 className="flex flex-wrap items-baseline gap-x-2.5 text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
        {objectionLabel}
        <span className="text-[1.0625rem] font-medium text-ink-3">
          {stageLabel}
        </span>
      </h1>

      {rebuttal.draft && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <svg
            aria-hidden
            width="18" height="18" viewBox="0 0 20 20" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            className="mt-0.5 shrink-0 text-amber-600"
          >
            <path d="M10 3.5 17 16H3l7-12.5Z" strokeLinejoin="round" />
            <path d="M10 8.5v3.2M10 14.2h.01" />
          </svg>
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
                className="card rounded-2xl border border-line bg-white p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug text-ink">
                    <span className="font-normal text-ink-3">
                      {t('condition', lang)}{' '}
                    </span>
                    {pick(b.condition, lang)}
                  </h3>
                  <span className="mt-0.5 shrink-0 rounded-md bg-panel px-2 py-0.5 text-[11px] font-medium text-ink-3">
                    {pick(b.label, lang)}
                  </span>
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

      {feedback}
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
    { key: 'success', label: t('outcomeSuccess', lang), tone: 'emerald', Icon: IconTarget },
    { key: 'callback', label: t('outcomeCallback', lang), tone: 'amber', Icon: IconClock },
    { key: 'lost', label: t('outcomeLost', lang), tone: 'rose', Icon: IconSlash },
  ] as const

  if (outcome) {
    const chosen = options.find((o) => o.key === outcome)
    return (
      <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <IconCheck size={16} className="text-emerald-600" />
          {t('outcomeSaved', lang)}: {chosen?.label}
        </span>
        <button
          onClick={() => onPick(null)}
          className="rounded text-ink-3 underline underline-offset-2 transition-colors duration-200 hover:text-ink"
        >
          {t('outcomeUndo', lang)}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
      <span className="text-sm text-ink-3">{t('outcomeAsk', lang)}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 ${TONES[o.tone]}`}
          >
            <o.Icon size={15} />
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
    'border-line text-ink-2 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
  amber:
    'border-line text-ink-2 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700',
  rose: 'border-line text-ink-2 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
} as const

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
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
      <div className="mt-3 whitespace-pre-line rounded-xl border border-accent-line bg-accent-soft p-5 text-[1.0625rem] leading-[1.65] text-ink">
        {text}
      </div>
    )
  }

  // Ответ ветки.
  return (
    <div className="whitespace-pre-line rounded-xl border border-line bg-canvas p-4 text-[15px] leading-relaxed text-ink-2">
      {text}
    </div>
  )
}
