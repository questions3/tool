/** Язык контента и интерфейса */
export type Lang = 'ru' | 'pl'

/** Этап разговора, на котором всплыло возражение */
export type StageId = 'intro' | 'before_lk' | 'after_lk'

/** Идентификатор возражения */
export type ObjectionId = 'no_funds' | 'consult' | 'not_interested' | 'call_later'

/** Локализованная строка (RU + PL) */
export type Localized = Record<Lang, string>

/** Ветка «what-if»: условие из диалога → реакция агента */
export interface Branch {
  /** Заголовок варианта: «Вариант A» и т.п. */
  label: Localized
  /** Условие — что уже было / не было в диалоге */
  condition: Localized
  /** Готовый ответ под это условие */
  response: Localized
}

/** Готовый скрипт под (возражение × этап) */
export interface Rebuttal {
  objectionId: ObjectionId
  stage: StageId
  /** Базовый готовый ответ */
  answer: Localized
  /** Ветки what-if (до 3) */
  branches: Branch[]
  /** Контент-заглушка до загрузки реальных скриптов */
  draft?: boolean
}

export interface Objection {
  id: ObjectionId
  label: Localized
  /** Короткая подпись-подсказка */
  hint: Localized
}

export interface Stage {
  id: StageId
  label: Localized
  hint: Localized
}
