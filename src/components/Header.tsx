import type { Lang, Language } from '../types'
import { t } from '../i18n/ui'
import { LangToggle } from './LangToggle'
import { Logo } from './Logo'
import { IconExternal, IconSearch } from './icons'
import { ProfileMenu } from './ProfileMenu'

interface Props {
  lang: Lang
  languages: Language[]
  onLangChange: (lang: Lang) => void
  onLogout: () => void
  onHome: () => void
  /** Не передан — кнопка поиска не показывается (нет базы). */
  onSearch?: () => void
  /** Кто вошёл. null — фолбэк-режим без базы. */
  email?: string | null
  /** Открыть справку по горячим клавишам. */
  onHotkeys?: () => void
}

export function Header({
  lang,
  languages,
  onLangChange,
  onLogout,
  onHome,
  onSearch,
  email = null,
  onHotkeys,
}: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onHome}
          title={t('appName', lang)}
          className="rounded-lg text-left"
        >
          <Logo size={34} subtitle={t('appTagline', lang)} />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {onSearch && (
            <button
              onClick={onSearch}
              title={`${t('searchAll', lang)} (Ctrl+K)`}
              aria-label={t('searchAll', lang)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-3 transition-colors duration-200 hover:border-accent-line hover:bg-accent-soft hover:text-accent"
            >
              <IconSearch size={18} />
            </button>
          )}
          <LangToggle lang={lang} languages={languages} onChange={onLangChange} />
          {/* Всё, что раньше висело кнопками, ушло под аватар: на узком
              экране они вытесняли переключатель языка. */}
          <ProfileMenu
            email={email}
            subtitle={t('appTagline', lang)}
            items={[
              ...(onHotkeys
                ? [{ label: t('hotkeys', lang), onClick: onHotkeys }]
                : []),
              {
                label: t('adminLink', lang),
                href: '/admin',
                icon: <IconExternal size={16} />,
              },
              { label: t('logout', lang), onClick: onLogout, danger: true },
            ]}
          />
        </div>
      </div>
      {/* Единственное место, где перелив работает как декор — и то в пиксель. */}
      <div aria-hidden className="brand-rule h-px w-full opacity-70" />
    </header>
  )
}
