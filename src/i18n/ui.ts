import type { Lang, Localized } from '../types'

/** Базовый язык интерфейса — fallback, когда у языка нет UI-перевода. */
export const BASE_UI_LANG = 'ru'

/** Подписи интерфейса (не контент скриптов). Переведены на все 5 языков. */
export const ui = {
  appName: { ru: 'Convvy', pl: 'Convvy', en: 'Convvy', de: 'Convvy', es: 'Convvy' },
  appTagline: {
    ru: 'Скрипты отработки возражений',
    pl: 'Skrypty obsługi obiekcji',
    en: 'Objection-handling scripts',
    de: 'Einwandbehandlungs-Skripte',
    es: 'Guiones para manejar objeciones',
  },

  // Auth
  loginTitle: {
    ru: 'Вход для агентов',
    pl: 'Logowanie agentów',
    en: 'Agent login',
    de: 'Agenten-Login',
    es: 'Acceso de agentes',
  },
  loginSubtitle: {
    ru: 'Доступ только для сотрудников Convvy',
    pl: 'Dostęp tylko dla pracowników Convvy',
    en: 'For Convvy staff only',
    de: 'Nur für Convvy-Mitarbeiter',
    es: 'Solo para empleados de Convvy',
  },
  enter: { ru: 'Войти', pl: 'Zaloguj', en: 'Sign in', de: 'Anmelden', es: 'Entrar' },
  logout: { ru: 'Выйти', pl: 'Wyloguj', en: 'Sign out', de: 'Abmelden', es: 'Salir' },

  // Auth — вход по коду на email (OTP)
  emailLabel: {
    ru: 'Рабочий email',
    pl: 'Służbowy email',
    en: 'Work email',
    de: 'Arbeits-E-Mail',
    es: 'Correo de trabajo',
  },
  emailPlaceholder: {
    ru: 'agent@convvy.com',
    pl: 'agent@convvy.com',
    en: 'agent@convvy.com',
    de: 'agent@convvy.com',
    es: 'agent@convvy.com',
  },
  sendCode: {
    ru: 'Получить код',
    pl: 'Wyślij kod',
    en: 'Get code',
    de: 'Code anfordern',
    es: 'Obtener código',
  },
  sending: {
    ru: 'Отправляем…',
    pl: 'Wysyłanie…',
    en: 'Sending…',
    de: 'Senden…',
    es: 'Enviando…',
  },
  codeLabel: {
    ru: 'Код из письма',
    pl: 'Kod z e-maila',
    en: 'Code from email',
    de: 'Code aus der E-Mail',
    es: 'Código del correo',
  },
  codePlaceholder: {
    ru: 'Код из письма',
    pl: 'Kod z e-maila',
    en: 'Enter code',
    de: 'Code eingeben',
    es: 'Introduce el código',
  },
  verifying: {
    ru: 'Проверяем…',
    pl: 'Sprawdzanie…',
    en: 'Verifying…',
    de: 'Wird geprüft…',
    es: 'Verificando…',
  },
  codeSentTo: {
    ru: 'Мы отправили код на',
    pl: 'Wysłaliśmy kod na adres',
    en: 'We sent a code to',
    de: 'Wir haben einen Code gesendet an',
    es: 'Enviamos un código a',
  },
  changeEmail: {
    ru: 'Изменить email',
    pl: 'Zmień email',
    en: 'Change email',
    de: 'E-Mail ändern',
    es: 'Cambiar correo',
  },
  resendCode: {
    ru: 'Отправить код ещё раз',
    pl: 'Wyślij kod ponownie',
    en: 'Resend code',
    de: 'Code erneut senden',
    es: 'Reenviar código',
  },
  emailHint: {
    ru: 'Запросите доступ у администратора, предоставив рабочий email',
    pl: 'Poproś administratora o dostęp, podając służbowy email',
    en: 'Ask an administrator for access with your work email',
    de: 'Bitten Sie einen Administrator mit Ihrer Arbeits-E-Mail um Zugang',
    es: 'Solicita acceso al administrador con tu correo de trabajo',
  },
  errEmailNotAllowed: {
    ru: 'Этот email не в списке агентов. Обратитесь к администратору.',
    pl: 'Tego adresu nie ma na liście agentów. Skontaktuj się z administratorem.',
    en: 'This email is not on the agents list. Contact an administrator.',
    de: 'Diese E-Mail steht nicht auf der Agentenliste. Wenden Sie sich an einen Administrator.',
    es: 'Este correo no está en la lista de agentes. Contacta con el administrador.',
  },
  errSendFailed: {
    ru: 'Не удалось отправить код. Попробуйте ещё раз.',
    pl: 'Nie udało się wysłać kodu. Spróbuj ponownie.',
    en: 'Could not send the code. Please try again.',
    de: 'Code konnte nicht gesendet werden. Bitte erneut versuchen.',
    es: 'No se pudo enviar el código. Inténtalo de nuevo.',
  },
  errInvalidCode: {
    ru: 'Неверный или просроченный код.',
    pl: 'Nieprawidłowy lub wygasły kod.',
    en: 'Invalid or expired code.',
    de: 'Ungültiger oder abgelaufener Code.',
    es: 'Código no válido o caducado.',
  },
  errNotConfigured: {
    ru: 'Вход недоступен: не настроен Supabase.',
    pl: 'Logowanie niedostępne: brak konfiguracji Supabase.',
    en: 'Login unavailable: Supabase is not configured.',
    de: 'Anmeldung nicht verfügbar: Supabase ist nicht konfiguriert.',
    es: 'Acceso no disponible: Supabase no está configurado.',
  },

  // Home — выбор раздела (4 плитки)
  homeTitle: {
    ru: 'Выберите раздел',
    pl: 'Wybierz sekcję',
    en: 'Choose a section',
    de: 'Bereich wählen',
    es: 'Elige una sección',
  },
  navObjections: {
    ru: 'Возражения',
    pl: 'Obiekcje',
    en: 'Objections',
    de: 'Einwände',
    es: 'Objeciones',
  },
  navPresentations: {
    ru: 'Презентации',
    pl: 'Prezentacje',
    en: 'Presentations',
    de: 'Präsentationen',
    es: 'Presentaciones',
  },
  navServices: {
    ru: 'Сервисы',
    pl: 'Usługi',
    en: 'Services',
    de: 'Dienste',
    es: 'Servicios',
  },
  navMarket: {
    ru: 'Рынок',
    pl: 'Rynek',
    en: 'Market',
    de: 'Markt',
    es: 'Mercado',
  },
  hintObjections: {
    ru: 'Отработка возражений по шагам',
    pl: 'Obsługa obiekcji krok po kroku',
    en: 'Step-by-step objection handling',
    de: 'Einwandbehandlung Schritt für Schritt',
    es: 'Manejo de objeciones paso a paso',
  },
  hintPresentations: {
    ru: 'Материалы и презентации',
    pl: 'Materiały i prezentacje',
    en: 'Materials and presentations',
    de: 'Materialien und Präsentationen',
    es: 'Materiales y presentaciones',
  },
  hintServices: {
    ru: 'Спичи по услугам',
    pl: 'Skrypty usług',
    en: 'Service talk tracks',
    de: 'Gesprächsleitfäden für Dienste',
    es: 'Discursos de servicios',
  },
  hintMarket: {
    ru: 'Спичи о рынке и преимуществах',
    pl: 'Skrypty o rynku i przewagach',
    en: 'Market and advantages talk tracks',
    de: 'Markt- und Vorteils-Leitfäden',
    es: 'Discursos de mercado y ventajas',
  },
  back: { ru: 'Назад', pl: 'Wstecz', en: 'Back', de: 'Zurück', es: 'Atrás' },
  home: { ru: 'Главная', pl: 'Start', en: 'Home', de: 'Start', es: 'Inicio' },
  noEntries: {
    ru: 'Для этого языка пока нет материалов.',
    pl: 'Brak materiałów dla tego języka.',
    en: 'No materials for this language yet.',
    de: 'Noch keine Materialien für diese Sprache.',
    es: 'Aún no hay materiales para este idioma.',
  },

  // Steps
  step: { ru: 'Шаг', pl: 'Krok', en: 'Step', de: 'Schritt', es: 'Paso' },
  step1Title: {
    ru: 'Выберите возражение',
    pl: 'Wybierz obiekcję',
    en: 'Choose an objection',
    de: 'Einwand wählen',
    es: 'Elige una objeción',
  },
  step2Title: {
    ru: 'Этап разговора',
    pl: 'Etap rozmowy',
    en: 'Conversation stage',
    de: 'Gesprächsphase',
    es: 'Etapa de la conversación',
  },
  step3Title: {
    ru: 'Готовый ответ',
    pl: 'Gotowa odpowiedź',
    en: 'Ready answer',
    de: 'Fertige Antwort',
    es: 'Respuesta lista',
  },
  stepperObjection: {
    ru: 'Возражение',
    pl: 'Obiekcja',
    en: 'Objection',
    de: 'Einwand',
    es: 'Objeción',
  },
  stepperStage: { ru: 'Этап', pl: 'Etap', en: 'Stage', de: 'Phase', es: 'Etapa' },
  stepperAnswer: {
    ru: 'Ответ',
    pl: 'Odpowiedź',
    en: 'Answer',
    de: 'Antwort',
    es: 'Respuesta',
  },
  stepperEntry: {
    ru: 'Материал',
    pl: 'Materiał',
    en: 'Item',
    de: 'Eintrag',
    es: 'Material',
  },

  // Answer screen
  baseAnswer: {
    ru: 'Базовый скрипт',
    pl: 'Skrypt bazowy',
    en: 'Base script',
    de: 'Basis-Skript',
    es: 'Guion base',
  },
  whatIf: {
    ru: 'Варианты развития · what-if',
    pl: 'Warianty rozwoju · what-if',
    en: 'What-if branches',
    de: 'Was-wäre-wenn · Varianten',
    es: 'Variantes · what-if',
  },
  condition: { ru: 'Если', pl: 'Jeśli', en: 'If', de: 'Wenn', es: 'Si' },
  draftBadge: {
    ru: 'Черновик · ждём финальный текст',
    pl: 'Wersja robocza · czekamy na finał',
    en: 'Draft · final text pending',
    de: 'Entwurf · finaler Text folgt',
    es: 'Borrador · texto final pendiente',
  },
  draftNote: {
    ru: 'Шаблон-заглушка. Реальные скрипты заказчик пришлёт структурно — подставятся в это поле.',
    pl: 'Szablon zastępczy. Finalne skrypty zostaną podstawione w to miejsce.',
    en: 'Placeholder template. The final scripts will be inserted here.',
    de: 'Platzhalter-Vorlage. Die finalen Skripte werden hier eingefügt.',
    es: 'Plantilla provisional. Los guiones finales se insertarán aquí.',
  },

  // Исход разговора — необязательная отметка под скриптом
  outcomeAsk: {
    ru: 'Чем закончился разговор?',
    pl: 'Jak zakończyła się rozmowa?',
    en: 'How did the call end?',
    de: 'Wie endete das Gespräch?',
    es: '¿Cómo terminó la llamada?',
  },
  outcomeSuccess: {
    ru: 'Сработало',
    pl: 'Zadziałało',
    en: 'Worked',
    de: 'Hat geklappt',
    es: 'Funcionó',
  },
  outcomeCallback: {
    ru: 'Перезвон',
    pl: 'Oddzwonić',
    en: 'Call back',
    de: 'Rückruf',
    es: 'Volver a llamar',
  },
  outcomeLost: {
    ru: 'Не сработало',
    pl: 'Nie zadziałało',
    en: 'Did not work',
    de: 'Hat nicht geklappt',
    es: 'No funcionó',
  },
  outcomeSaved: {
    ru: 'Отмечено',
    pl: 'Zapisano',
    en: 'Recorded',
    de: 'Erfasst',
    es: 'Registrado',
  },
  outcomeUndo: {
    ru: 'Изменить',
    pl: 'Zmień',
    en: 'Change',
    de: 'Ändern',
    es: 'Cambiar',
  },

  // Личные заметки оператора
  noteTitle: {
    ru: 'Моя заметка',
    pl: 'Moja notatka',
    en: 'My note',
    de: 'Meine Notiz',
    es: 'Mi nota',
  },
  noteAdd: {
    ru: 'Добавить заметку',
    pl: 'Dodaj notatkę',
    en: 'Add a note',
    de: 'Notiz hinzufügen',
    es: 'Añadir nota',
  },
  notePlaceholder: {
    ru: 'Что сработало у вас в этом возражении',
    pl: 'Co zadziałało u ciebie przy tej obiekcji',
    en: 'What worked for you on this objection',
    de: 'Was bei diesem Einwand funktioniert hat',
    es: 'Qué te funcionó con esta objeción',
  },
  notePrivate: {
    ru: 'Видно только вам',
    pl: 'Widoczne tylko dla ciebie',
    en: 'Visible only to you',
    de: 'Nur für Sie sichtbar',
    es: 'Solo visible para ti',
  },
  save: { ru: 'Сохранить', pl: 'Zapisz', en: 'Save', de: 'Speichern', es: 'Guardar' },
  saved: { ru: 'Сохранено', pl: 'Zapisano', en: 'Saved', de: 'Gespeichert', es: 'Guardado' },
  cancel: { ru: 'Отмена', pl: 'Anuluj', en: 'Cancel', de: 'Abbrechen', es: 'Cancelar' },
  deleteNote: { ru: 'Удалить', pl: 'Usuń', en: 'Delete', de: 'Löschen', es: 'Eliminar' },

  // Сквозной поиск
  searchAll: {
    ru: 'Поиск по всем скриптам',
    pl: 'Szukaj we wszystkich skryptach',
    en: 'Search all scripts',
    de: 'Alle Skripte durchsuchen',
    es: 'Buscar en todos los guiones',
  },
  searchHint: {
    ru: 'Введите слово из скрипта — найдём везде',
    pl: 'Wpisz słowo ze skryptu — znajdziemy wszędzie',
    en: 'Type a word from a script — we search everywhere',
    de: 'Wort aus einem Skript eingeben — wir suchen überall',
    es: 'Escribe una palabra del guion — buscamos en todo',
  },
  searchEmpty: {
    ru: 'Ничего не нашлось',
    pl: 'Nic nie znaleziono',
    en: 'Nothing found',
    de: 'Nichts gefunden',
    es: 'No se encontró nada',
  },
  searchKindObjection: {
    ru: 'Возражение',
    pl: 'Obiekcja',
    en: 'Objection',
    de: 'Einwand',
    es: 'Objeción',
  },
  searchKindScript: {
    ru: 'Скрипт',
    pl: 'Skrypt',
    en: 'Script',
    de: 'Skript',
    es: 'Guion',
  },
  searchKindBranch: {
    ru: 'Ветка',
    pl: 'Wariant',
    en: 'Branch',
    de: 'Variante',
    es: 'Variante',
  },
  searchKindEntry: {
    ru: 'Материал',
    pl: 'Materiał',
    en: 'Item',
    de: 'Eintrag',
    es: 'Material',
  },

  // Теги
  allTags: {
    ru: 'Все',
    pl: 'Wszystkie',
    en: 'All',
    de: 'Alle',
    es: 'Todas',
  },

  // Плашка «Что нового»
  whatsNew: {
    ru: 'Что нового',
    pl: 'Co nowego',
    en: "What's new",
    de: 'Was ist neu',
    es: 'Novedades',
  },
  whatsNewAdded: {
    ru: 'новое',
    pl: 'nowe',
    en: 'new',
    de: 'neu',
    es: 'nuevo',
  },
  whatsNewUpdated: {
    ru: 'обновлено',
    pl: 'zaktualizowane',
    en: 'updated',
    de: 'aktualisiert',
    es: 'actualizado',
  },
  dismiss: {
    ru: 'Понятно',
    pl: 'Jasne',
    en: 'Got it',
    de: 'Verstanden',
    es: 'Entendido',
  },

  // Режим «в звонке» — горячие клавиши
  hotkeys: {
    ru: 'Горячие клавиши',
    pl: 'Skróty klawiszowe',
    en: 'Keyboard shortcuts',
    de: 'Tastenkürzel',
    es: 'Atajos de teclado',
  },
  hotkeysHint: {
    ru: '1–9 — выбрать карточку · / — поиск · Esc — назад · ? — справка',
    pl: '1–9 — wybór karty · / — szukaj · Esc — wstecz · ? — pomoc',
    en: '1–9 pick a card · / search · Esc back · ? help',
    de: '1–9 Karte wählen · / Suche · Esc zurück · ? Hilfe',
    es: '1–9 elegir tarjeta · / buscar · Esc atrás · ? ayuda',
  },

  // Loading / errors
  loading: {
    ru: 'Загрузка…',
    pl: 'Ładowanie…',
    en: 'Loading…',
    de: 'Wird geladen…',
    es: 'Cargando…',
  },
  loadError: {
    ru: 'Не удалось загрузить контент.',
    pl: 'Nie udało się załadować treści.',
    en: 'Failed to load content.',
    de: 'Inhalt konnte nicht geladen werden.',
    es: 'No se pudo cargar el contenido.',
  },
  refresh: {
    ru: 'Обновить',
    pl: 'Odśwież',
    en: 'Refresh',
    de: 'Neu laden',
    es: 'Actualizar',
  },
  noStages: {
    ru: 'Для этого языка пока нет этапов. Вернитесь назад.',
    pl: 'Brak etapów dla tego języka. Wróć.',
    en: 'No stages for this language yet. Go back.',
    de: 'Für diese Sprache gibt es noch keine Phasen. Gehen Sie zurück.',
    es: 'Aún no hay etapas para este idioma. Vuelve.',
  },
  emptyContent: {
    ru: 'Контент ещё не добавлен. Зайдите в админ-панель.',
    pl: 'Treść nie została jeszcze dodana. Wejdź do panelu admina.',
    en: 'No content added yet. Open the admin panel.',
    de: 'Noch kein Inhalt vorhanden. Öffnen Sie das Admin-Panel.',
    es: 'Aún no hay contenido. Abre el panel de administración.',
  },
  // Поиск и избранное (шаг выбора возражения)
  searchPlaceholder: {
    ru: 'Поиск по возражениям…',
    pl: 'Szukaj obiekcji…',
    en: 'Search objections…',
    de: 'Einwände suchen…',
    es: 'Buscar objeciones…',
  },
  searchNoResults: {
    ru: 'Ничего не найдено. Измените запрос.',
    pl: 'Nic nie znaleziono. Zmień zapytanie.',
    en: 'Nothing found. Try a different query.',
    de: 'Nichts gefunden. Andere Suche versuchen.',
    es: 'No se encontró nada. Prueba otra búsqueda.',
  },
  searchClear: {
    ru: 'Очистить',
    pl: 'Wyczyść',
    en: 'Clear',
    de: 'Löschen',
    es: 'Borrar',
  },
  favoritesGroup: {
    ru: 'Избранное',
    pl: 'Ulubione',
    en: 'Favorites',
    de: 'Favoriten',
    es: 'Favoritos',
  },
  addFavorite: {
    ru: 'В избранное',
    pl: 'Do ulubionych',
    en: 'Add to favorites',
    de: 'Zu Favoriten',
    es: 'Añadir a favoritos',
  },
  removeFavorite: {
    ru: 'Убрать из избранного',
    pl: 'Usuń z ulubionych',
    en: 'Remove from favorites',
    de: 'Aus Favoriten entfernen',
    es: 'Quitar de favoritos',
  },

  noScript: {
    ru: 'Скрипт для этой пары пока готовится. Вернитесь назад и выберите другое возражение или этап.',
    pl: 'Skrypt dla tej pary jest w przygotowaniu. Wróć i wybierz inną obiekcję lub etap.',
    en: 'The script for this pair is being prepared. Go back and pick another objection or stage.',
    de: 'Das Skript für diese Kombination wird vorbereitet. Gehen Sie zurück und wählen Sie einen anderen Einwand oder eine andere Phase.',
    es: 'El guion para esta combinación se está preparando. Vuelve y elige otra objeción o etapa.',
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

/**
 * true — если у локализованного значения есть непустой текст на языке `lang`.
 * Используется как языковой фильтр контента: показываем элемент только если
 * он переведён на выбранный язык.
 */
export function hasLang(value: Localized | undefined, lang: Lang): boolean {
  const v = value?.[lang]
  return typeof v === 'string' && v.trim() !== ''
}

/**
 * Есть ли готовый текст на языке с учётом непереведённых копий.
 *
 * Копия на другой язык заполняет поле текстом языка-источника, чтобы
 * переводчику было что править. До перевода такой язык считается пустым:
 * иначе оператор получит текст на чужом языке вместо «нет скрипта».
 */
export function hasTranslated(
  value: Localized | undefined,
  lang: Lang,
  draftLangs?: string[],
): boolean {
  if (draftLangs?.includes(lang)) return false
  return hasLang(value, lang)
}
