import { useEffect } from 'react'
import type { Lang } from '../types'
import { t } from '../i18n/ui'
import { IconClose } from './icons'

/**
 * Справка по горячим клавишам.
 *
 * Раньше подсказка нигде не показывалась: клавиши работали, но узнать о
 * них было неоткуда, кроме номеров на карточках. Открывается из меню
 * профиля и по «?».
 */
export function HotkeysHelp({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows: [string, string][] = [
    ['1 – 9', t('hkCard', lang)],
    ['/', t('hkSearch', lang)],
    ['Ctrl + K', t('searchAll', lang)],
    ['Esc', t('hkBack', lang)],
    ['?', t('hotkeys', lang)],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('hotkeys', lang)}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-12px_rgba(14,19,48,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{t('hotkeys', lang)}</h2>
          <button
            onClick={onClose}
            aria-label={t('cancel', lang)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors duration-200 hover:bg-panel hover:text-ink"
          >
            <IconClose size={16} />
          </button>
        </div>
        <ul className="flex flex-col">
          {rows.map(([key, label]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 text-sm last:border-b-0"
            >
              <span className="text-ink-2">{label}</span>
              <kbd className="shrink-0 rounded-md border border-line bg-canvas px-2 py-0.5 font-mono text-xs text-ink-3">
                {key}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
