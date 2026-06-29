import { supabase } from '../lib/supabase'
import type { Language, Localized, Objection, Rebuttal, Stage } from '../types'
import {
  toLanguage,
  toObjection,
  toRebuttal,
  toStage,
  type LanguageRow,
  type ObjectionRow,
  type RebuttalRow,
  type StageRow,
} from './mappers'

/**
 * Слой доступа к данным Supabase. Чтения публичны (RLS: `using (true)`),
 * записи разрешены только админам (RLS: `is_admin()`).
 *
 * Все функции требуют настроенного клиента — вызывающий код проверяет
 * `isSupabaseConfigured` и при отсутствии БД использует фолбэк из content.ts.
 */

function db() {
  if (!supabase) throw new Error('Supabase не настроен (нет env-переменных).')
  return supabase
}

/* ─────────────── Чтения ─────────────── */

export async function fetchLanguages(): Promise<Language[]> {
  const { data, error } = await db()
    .from('languages')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as LanguageRow[]).map(toLanguage)
}

export async function fetchObjections(): Promise<Objection[]> {
  const { data, error } = await db()
    .from('objections')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as ObjectionRow[]).map(toObjection)
}

export async function fetchStages(): Promise<Stage[]> {
  const { data, error } = await db()
    .from('stages')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data as StageRow[]).map(toStage)
}

export async function fetchRebuttals(): Promise<Rebuttal[]> {
  const { data, error } = await db()
    .from('rebuttals')
    .select('*, branches(*)')
    .order('sort_order')
  if (error) throw error
  return (data as RebuttalRow[]).map(toRebuttal)
}

export async function fetchRebuttal(
  objectionId: string,
  stageId: string,
): Promise<Rebuttal | null> {
  const { data, error } = await db()
    .from('rebuttals')
    .select('*, branches(*)')
    .eq('objection_id', objectionId)
    .eq('stage_id', stageId)
    .maybeSingle()
  if (error) throw error
  return data ? toRebuttal(data as RebuttalRow) : null
}

/* ─────────────── Записи (только админ) ─────────────── */

export interface LanguageInput {
  code: string
  name: string
  isEnabled: boolean
  sortOrder: number
}

export async function saveLanguage(input: LanguageInput): Promise<void> {
  const { error } = await db()
    .from('languages')
    .upsert(
      {
        code: input.code,
        name: input.name,
        is_enabled: input.isEnabled,
        sort_order: input.sortOrder,
      },
      { onConflict: 'code' },
    )
  if (error) throw error
}

export async function deleteLanguage(code: string): Promise<void> {
  const { error } = await db().from('languages').delete().eq('code', code)
  if (error) throw error
}

export interface TermInput {
  id?: string
  slug: string
  label: Localized
  hint: Localized
  isEnabled: boolean
  sortOrder: number
}

function termRow(input: TermInput) {
  return {
    slug: input.slug,
    label: input.label,
    hint: input.hint,
    is_enabled: input.isEnabled,
    sort_order: input.sortOrder,
  }
}

export async function saveObjection(input: TermInput): Promise<void> {
  const table = db().from('objections')
  const { error } = input.id
    ? await table.update(termRow(input)).eq('id', input.id)
    : await table.insert(termRow(input))
  if (error) throw error
}

export async function deleteObjection(id: string): Promise<void> {
  const { error } = await db().from('objections').delete().eq('id', id)
  if (error) throw error
}

export async function saveStage(input: TermInput): Promise<void> {
  const table = db().from('stages')
  const { error } = input.id
    ? await table.update(termRow(input)).eq('id', input.id)
    : await table.insert(termRow(input))
  if (error) throw error
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await db().from('stages').delete().eq('id', id)
  if (error) throw error
}

export interface RebuttalInput {
  id?: string
  objectionId: string
  stageId: string
  answer: Localized
  isDraft: boolean
}

/** Создать/обновить скрипт. Возвращает id записи (для работы с ветками). */
export async function saveRebuttal(input: RebuttalInput): Promise<string> {
  const row = {
    objection_id: input.objectionId,
    stage_id: input.stageId,
    answer: input.answer,
    is_draft: input.isDraft,
  }
  if (input.id) {
    const { error } = await db()
      .from('rebuttals')
      .update(row)
      .eq('id', input.id)
    if (error) throw error
    return input.id
  }
  const { data, error } = await db()
    .from('rebuttals')
    .insert(row)
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function deleteRebuttal(id: string): Promise<void> {
  const { error } = await db().from('rebuttals').delete().eq('id', id)
  if (error) throw error
}

export interface BranchInput {
  id?: string
  rebuttalId: string
  label: Localized
  condition: Localized
  response: Localized
  sortOrder: number
}

export async function saveBranch(input: BranchInput): Promise<void> {
  const row = {
    rebuttal_id: input.rebuttalId,
    label: input.label,
    condition: input.condition,
    response: input.response,
    sort_order: input.sortOrder,
  }
  const table = db().from('branches')
  const { error } = input.id
    ? await table.update(row).eq('id', input.id)
    : await table.insert(row)
  if (error) throw error
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await db().from('branches').delete().eq('id', id)
  if (error) throw error
}
