import type { Lang, Language } from '../types'
import { t } from '../i18n/ui'
import { LangToggle } from './LangToggle'

interface Props {
  lang: Lang
  languages: Language[]
  onLangChange: (lang: Lang) => void
  onLogout: () => void
  onHome: () => void
}

export function Header({ lang, languages, onLangChange, onLogout, onHome }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onHome}
          title={t('appName', lang)}
          className="flex items-center gap-2.5 rounded-lg text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white">
            C
          </span>
          <div className="leading-tight">
            <div className="text-base font-semibold text-slate-900">
              {t('appName', lang)}
            </div>
            <div className="hidden text-[11px] text-slate-500 sm:block">
              {t('appTagline', lang)}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <LangToggle lang={lang} languages={languages} onChange={onLangChange} />
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            {t('logout', lang)}
          </button>
        </div>
      </div>
    </header>
  )
}
