import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'
import { IconPlus } from './icons'

interface Props {
  lang: Lang
  body: string
  saving: boolean
  error: boolean
  onSave: (text: string) => void | Promise<void>
}

/**
 * Личная заметка под скриптом.
 *
 * Пока заметки нет — только неприметная ссылка «Добавить заметку»: экран
 * во время звонка должен оставаться коротким. Есть заметка — показываем
 * её текстом, редактирование по клику.
 */
export function NotePanel({ lang, body, saving, error, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(body)
  const area = useRef<HTMLTextAreaElement>(null)

  // Переключились на другой скрипт — выходим из редактирования.
  useEffect(() => {
    setDraft(body)
    setEditing(false)
  }, [body])

  useEffect(() => {
    if (editing) area.current?.focus()
  }, [editing])

  async function commit() {
    await onSave(draft)
    setEditing(false)
  }

  if (!editing && !body) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 rounded text-sm text-ink-3 transition-colors duration-200 hover:text-accent"
        >
          <IconPlus size={15} />
          <span className="underline underline-offset-2">{t('noteAdd', lang)}</span>
        </button>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            {t('noteTitle', lang)}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="rounded text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            {t('outcomeUndo', lang)}
          </button>
        </div>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
          {body}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-white px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          {t('noteTitle', lang)}
        </span>
        <span className="text-[11px] text-ink-3">{t('notePrivate', lang)}</span>
      </div>
      <textarea
        ref={area}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder={t('notePlaceholder', lang)}
        className="mt-2 w-full resize-y rounded-md border border-line px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void commit()}
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? '…' : t('save', lang)}
        </button>
        <button
          onClick={() => {
            setDraft(body)
            setEditing(false)
          }}
          className="rounded-md px-3 py-1.5 text-sm text-ink-3 transition hover:bg-panel"
        >
          {t('cancel', lang)}
        </button>
        {error && (
          <span className="text-sm text-red-600">{t('loadError', lang)}</span>
        )}
      </div>
    </div>
  )
}
