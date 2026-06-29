import type { Lang, Localized } from '../types'

/** Базовый язык интерфейса — fallback, когда у языка нет UI-перевода. */
export const BASE_UI_LANG = 'ru'

/** Подписи интерфейса (не контент скриптов). */
export const ui = {
  appName: { ru: 'Convvy', pl: 'Convvy' },
  appTagline: {
    ru: 'Скрипты отработки возражений',
    pl: 'Skrypty obsługi obiekcji',
  },

  // Auth
  loginTitle: { ru: 'Вход для агентов', pl: 'Logowanie agentów' },
  loginSubtitle: {
    ru: 'Доступ только для сотрудников Convvy',
    pl: 'Dostęp tylko dla pracowników Convvy',
  },
  passwordLabel: { ru: 'Пароль доступа', pl: 'Hasło dostępu' },
  passwordPlaceholder: { ru: 'Введите пароль', pl: 'Wpisz hasło' },
  enter: { ru: 'Войти', pl: 'Zaloguj' },
  logout: { ru: 'Выйти', pl: 'Wyloguj' },
  invalidPassword: { ru: 'Неверный пароль', pl: 'Błędne hasło' },
  passwordHint: {
    ru: 'Пароль выдаёт администратор',
    pl: 'Hasło udostępnia administrator',
  },
  defaultPasswordWarning: {
    ru: 'Задан пароль по умолчанию. Установите VITE_APP_PASSWORD в Netlify.',
    pl: 'Ustawiono hasło domyślne. Ustaw VITE_APP_PASSWORD w Netlify.',
  },

  // Steps
  step: { ru: 'Шаг', pl: 'Krok' },
  step1Title: { ru: 'Выберите возражение', pl: 'Wybierz obiekcję' },
  step2Title: { ru: 'Этап разговора', pl: 'Etap rozmowy' },
  step3Title: { ru: 'Готовый ответ', pl: 'Gotowa odpowiedź' },
  stepperObjection: { ru: 'Возражение', pl: 'Obiekcja' },
  stepperStage: { ru: 'Этап', pl: 'Etap' },
  stepperAnswer: { ru: 'Ответ', pl: 'Odpowiedź' },

  // Answer screen
  baseAnswer: { ru: 'Базовый скрипт', pl: 'Skrypt bazowy' },
  whatIf: { ru: 'Варианты развития · what-if', pl: 'Warianty rozwoju · what-if' },
  condition: { ru: 'Если', pl: 'Jeśli' },
  copy: { ru: 'Копировать', pl: 'Kopiuj' },
  copied: { ru: 'Скопировано', pl: 'Skopiowano' },
  draftBadge: {
    ru: 'Черновик · ждём финальный текст',
    pl: 'Wersja robocza · czekamy na finał',
  },
  draftNote: {
    ru: 'Шаблон-заглушка. Реальные скрипты заказчик пришлёт структурно — подставятся в это поле.',
    pl: 'Szablon zastępczy. Finalne skrypty zostaną podstawione w to miejsce.',
  },

  // Loading / errors
  loading: { ru: 'Загрузка…', pl: 'Ładowanie…' },
  loadError: {
    ru: 'Не удалось загрузить контент. Обновите страницу.',
    pl: 'Nie udało się załadować treści. Odśwież stronę.',
  },
  emptyContent: {
    ru: 'Контент ещё не добавлен. Зайдите в админ-панель.',
    pl: 'Treść nie została jeszcze dodana. Wejdź do panelu admina.',
  },
} satisfies Record<string, Localized>

export type UiKey = keyof typeof ui

/** Подпись интерфейса с fallback на базовый язык. */
export function t(key: UiKey, lang: Lang): string {
  return pick(ui[key], lang)
}

/**
 * Достать строку из локализованного значения с fallback:
 * нужный язык → базовый язык → первый доступный → ''.
 */
export function pick(value: Localized | undefined, lang: Lang): string {
  if (!value) return ''
  return value[lang] ?? value[BASE_UI_LANG] ?? Object.values(value)[0] ?? ''
}
