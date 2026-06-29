/**
 * Язык контента и интерфейса — код языка (`'ru'`, `'pl'`, `'de'`, …).
 *
 * Раньше это был жёсткий union `'ru' | 'pl'`. Теперь языки — данные
 * (таблица `languages` в Supabase / `fallbackLanguages` в content.ts),
 * поэтому тип открытый: `string`.
 */
export type Lang = string

/**
 * Идентификаторы возражения и этапа — раньше были union'ами, теперь это
 * slug'и из БД (`'no_funds'`, `'intro'`, …). Оставлены как алиасы для
 * читаемости сигнатур.
 */
export type ObjectionId = string
export type StageId = string

/** Локализованная строка: код языка → текст. Ключи могут отсутствовать. */
export type Localized = Record<string, string>

/** Язык контента («категория»). */
export interface Language {
  code: string
  name: string
  isEnabled: boolean
  sortOrder: number
}

/** Ветка «what-if»: условие из диалога → реакция агента. */
export interface Branch {
  /** id из БД (для статических данных может отсутствовать). */
  id?: string
  /** Заголовок варианта: «Вариант A» и т.п. */
  label: Localized
  /** Условие — что уже было / не было в диалоге. */
  condition: Localized
  /** Готовый ответ под это условие. */
  response: Localized
}

/** Готовый скрипт под (возражение × этап). */
export interface Rebuttal {
  id?: string
  objectionId: ObjectionId
  stageId: StageId
  /** Базовый готовый ответ. */
  answer: Localized
  /** Ветки what-if. */
  branches: Branch[]
  /** Контент-заглушка до загрузки реальных скриптов. */
  draft?: boolean
}

export interface Objection {
  id: ObjectionId
  /** Стабильный slug (он же используется как id в навигации). */
  slug?: string
  label: Localized
  /** Короткая подпись-подсказка. */
  hint: Localized
  /** Метаданные для админки (из БД). */
  isEnabled?: boolean
  sortOrder?: number
}

export interface Stage {
  id: StageId
  slug?: string
  label: Localized
  hint: Localized
  isEnabled?: boolean
  sortOrder?: number
}
