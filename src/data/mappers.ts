import type {
  Branch,
  Entry,
  Language,
  Localized,
  Objection,
  Rebuttal,
  SectionId,
  Stage,
} from '../types'

/* Строки таблиц Supabase (snake_case). */

export interface LanguageRow {
  code: string
  name: string
  is_enabled: boolean
  sort_order: number
}

export interface ObjectionRow {
  id: string
  slug: string
  label: Localized
  hint: Localized
  is_enabled: boolean
  sort_order: number
}

export interface StageRow {
  id: string
  slug: string
  label: Localized
  hint: Localized
  is_enabled: boolean
  sort_order: number
}

export interface BranchRow {
  id: string
  rebuttal_id: string
  label: Localized
  condition: Localized
  response: Localized
  sort_order: number
}

export interface RebuttalRow {
  id: string
  objection_id: string
  stage_id: string
  answer: Localized
  is_draft: boolean
  sort_order: number
  /** Приходит при nested-select `*, branches(*)`. */
  branches?: BranchRow[]
}

/* Маппинг row → доменный тип. */

export function toLanguage(r: LanguageRow): Language {
  return {
    code: r.code,
    name: r.name,
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
  }
}

export function toObjection(r: ObjectionRow): Objection {
  return {
    id: r.id,
    slug: r.slug,
    label: r.label ?? {},
    hint: r.hint ?? {},
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
  }
}

export function toStage(r: StageRow): Stage {
  return {
    id: r.id,
    slug: r.slug,
    label: r.label ?? {},
    hint: r.hint ?? {},
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
  }
}

export function toBranch(r: BranchRow): Branch {
  return {
    id: r.id,
    label: r.label ?? {},
    condition: r.condition ?? {},
    response: r.response ?? {},
  }
}

export interface EntryRow {
  id: string
  section: SectionId
  title: Localized
  body: Localized
  is_enabled: boolean
  sort_order: number
}

export function toEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    section: r.section,
    title: r.title ?? {},
    body: r.body ?? {},
    isEnabled: r.is_enabled,
    sortOrder: r.sort_order,
  }
}

export function toRebuttal(r: RebuttalRow): Rebuttal {
  const branches = (r.branches ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toBranch)
  return {
    id: r.id,
    objectionId: r.objection_id,
    stageId: r.stage_id,
    answer: r.answer ?? {},
    branches,
    draft: r.is_draft,
  }
}
