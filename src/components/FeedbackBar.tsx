import { useState } from 'react'
import type { Lang } from '../types'
import type { Vote } from '../data/repository'
import { t } from '../i18n/ui'
import { IconThumbDown, IconThumbUp } from './icons'

interface Props {
  lang: Lang
  vote: Vote | null
  sent: boolean
  busy: boolean
  onVote: (vote: Vote) => void
  onSuggest: (body: string) => void
}

/**
 * Оценка скрипта: палец вверх-вниз и предложение правки.
 *
 * Держим её приглушённой и в одну строку. Оператор на линии первым видит,
 * что формулировка не заходит, но экран во время звонка не должен
 * превращаться в анкету — поле для правки раскрывается по клику.
 */
export function FeedbackBar({ lang, vote, sent, busy, onVote, onSuggest }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function submit() {
    onSuggest(text)
    setText('')
    setOpen(false)
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Thumb
          active={vote === 'up'}
          disabled={busy}
          label={t('voteHelpful', lang)}
          onClick={() => onVote('up')}
          tone="up"
        />
        <Thumb
          active={vote === 'down'}
          disabled={busy}
          label={t('voteNotHelpful', lang)}
          onClick={() => onVote('down')}
          tone="down"
        />
        {!open && !sent && (
          <button
            onClick={() => setOpen(true)}
            className="rounded text-ink-3 underline underline-offset-2 transition hover:text-ink-2"
          >
            {t('suggestEdit', lang)}
          </button>
        )}
        {sent && (
          <span className="text-emerald-700">{t('suggestSent', lang)}</span>
        )}
      </div>

      {open && (
        <div className="mt-2 rounded-lg border border-line bg-white px-4 py-3">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t('suggestPlaceholder', lang)}
            className="w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={submit}
              disabled={busy || !text.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {t('send', lang)}
            </button>
            <button
              onClick={() => {
                setText('')
                setOpen(false)
              }}
              className="rounded-md px-3 py-1.5 text-sm text-ink-3 transition hover:bg-panel"
            >
              {t('cancel', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Thumb({
  active,
  disabled,
  label,
  onClick,
  tone,
}: {
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
  tone: 'up' | 'down'
}) {
  const on =
    tone === 'up'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : 'border-rose-300 bg-rose-50 text-rose-700'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-200 disabled:opacity-50 ${
        active
          ? on
          : 'border-line text-ink-3 hover:border-line-strong hover:bg-panel hover:text-ink-2'
      }`}
    >
      {tone === 'up' ? <IconThumbUp size={17} /> : <IconThumbDown size={17} />}
    </button>
  )
}
