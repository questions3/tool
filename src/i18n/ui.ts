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
  enter: { ru: 'Войти', pl: 'Zaloguj' },
  logout: { ru: 'Выйти', pl: 'Wyloguj' },

  // Auth — вход по коду на email (OTP)
  emailLabel: { ru: 'Рабочий email', pl: 'Służbowy email' },
  emailPlaceholder: { ru: 'agent@convvy.com', pl: 'agent@convvy.com' },
  sendCode: { ru: 'Получить код', pl: 'Wyślij kod' },
  sending: { ru: 'Отправляем…', pl: 'Wysyłanie…' },
  codeLabel: { ru: 'Код из письма', pl: 'Kod z e-maila' },
  codePlaceholder: { ru: 'Код из письма', pl: 'Kod z e-maila' },
  verifying: { ru: 'Проверяем…', pl: 'Sprawdzanie…' },
  codeSentTo: {
    ru: 'Мы отправили код на',
    pl: 'Wysłaliśmy kod na adres',
  },
  changeEmail: { ru: 'Изменить email', pl: 'Zmień email' },
  resendCode: { ru: 'Отправить код ещё раз', pl: 'Wyślij kod ponownie' },
  emailHint: {
    ru: 'Запросите доступ у администратора, предоставив рабочий email',
    pl: 'Poproś administratora o dostęp, podając służbowy email',
  },
  errEmailNotAllowed: {
    ru: 'Этот email не в списке агентов. Обратитесь к администратору.',
    pl: 'Tego adresu nie ma na liście agentów. Skontaktuj się z administratorem.',
  },
  errSendFailed: {
    ru: 'Не удалось отправить код. Попробуйте ещё раз.',
    pl: 'Nie udało się wysłać kodu. Spróbuj ponownie.',
  },
  errInvalidCode: {
    ru: 'Неверный или просроченный код.',
    pl: 'Nieprawidłowy lub wygasły kod.',
  },
  errNotConfigured: {
    ru: 'Вход недоступен: не настроен Supabase.',
    pl: 'Logowanie niedostępne: brak konfiguracji Supabase.',
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
  noScript: {
    ru: 'Скрипт для этой пары пока готовится. Вернитесь назад и выберите другое возражение или этап.',
    pl: 'Skrypt dla tej pary jest w przygotowaniu. Wróć i wybierz inną obiekcję lub etap.',
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
