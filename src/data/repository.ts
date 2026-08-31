import { supabase } from '../lib/supabase'
import type {
  Entry,
  Language,
  Localized,
  Objection,
  Outcome,
  Rebuttal,
  SectionId,
  Stage,
} from '../types'
import {
  toEntry,
  toLanguage,
  toObjection,
  toRebuttal,
  toStage,
  type EntryRow,
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

export async function fetchEntries(section: SectionId): Promise<Entry[]> {
  const { data, error } = await db()
    .from('entries')
    .select('*')
    .eq('section', section)
    .eq('is_enabled', true)
    .order('sort_order')
  if (error) throw error
  return (data as EntryRow[]).map(toEntry)
}

/** Все элементы раздела (включая выключенные) — для админки. */
export async function fetchEntriesAll(section: SectionId): Promise<Entry[]> {
  const { data, error } = await db()
    .from('entries')
    .select('*')
    .eq('section', section)
    .order('sort_order')
  if (error) throw error
  return (data as EntryRow[]).map(toEntry)
}

export interface EntryInput {
  id?: string
  section: SectionId
  title: Localized
  body: Localized
  isEnabled: boolean
  sortOrder: number
}

export async function saveEntry(input: EntryInput): Promise<void> {
  const row = {
    section: input.section,
    title: input.title,
    body: input.body,
    is_enabled: input.isEnabled,
    sort_order: input.sortOrder,
  }
  const table = db().from('entries')
  const { error } = input.id
    ? await table.update(row).eq('id', input.id)
    : await table.insert(row)
  if (error) throw error
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await db().from('entries').delete().eq('id', id)
  if (error) throw error
}

/** Атомарно поменять местами порядок двух строк (стрелки ▲/▼). */
export async function reorderSwap(
  table: 'objections' | 'stages' | 'entries',
  id1: string,
  id2: string,
): Promise<void> {
  const { error } = await db().rpc('reorder_swap', {
    p_table: table,
    p_id1: id1,
    p_id2: id2,
  })
  if (error) throw error
}

/**
 * Записать факт открытия скрипта. Пишется «в фоне»: телеметрия не должна
 * ломать работу оператора, поэтому все ошибки глушатся вызывающей стороной.
 */
export async function logScriptView(input: {
  objectionId: string
  stageId: string
  lang: string
  agentEmail?: string | null
}): Promise<void> {
  const { error } = await db().from('script_views').insert({
    objection_id: input.objectionId,
    stage_id: input.stageId,
    lang: input.lang,
    agent_email: input.agentEmail ?? null,
  })
  if (error) throw error
}

/** Записать вход оператора в журнал. Тоже «в фоне». */
export async function logAgentLogin(email: string): Promise<void> {
  const { error } = await db().from('agent_logins').insert({ email })
  if (error) throw error
}

/**
 * Записать исход разговора. Таблица только на добавление: правки и удаления
 * запрещены и RLS, и привилегиями, чтобы статистику нельзя было подкрутить
 * задним числом. Как и остальная телеметрия, пишется «в фоне».
 */
export async function logOutcome(input: {
  objectionId: string
  stageId: string
  lang: string
  outcome: Outcome
  agentEmail?: string | null
}): Promise<void> {
  const { error } = await db().from('script_outcomes').insert({
    objection_id: input.objectionId,
    stage_id: input.stageId,
    lang: input.lang,
    outcome: input.outcome,
    agent_email: input.agentEmail ?? null,
  })
  if (error) throw error
}

/** Строка сводки использования для админки. */
export interface UsageRow {
  objectionId: string
  label: Localized
  views: number
  lastViewed: string
}

/** Топ возражений по числу открытий за последние `days` дней. */
export async function fetchUsageSummary(days = 30): Promise<UsageRow[]> {
  const { data, error } = await db().rpc('usage_summary', { p_days: days })
  if (error) throw error
  const rows = (data ?? []) as {
    objection_id: string
    label: Localized
    views: number
    last_viewed: string
  }[]
  return rows.map((r) => ({
    objectionId: r.objection_id,
    label: r.label ?? {},
    views: Number(r.views),
    lastViewed: r.last_viewed,
  }))
}

/** Строка сводки эффективности: открытия против отмеченных исходов. */
export interface OutcomeRow {
  objectionId: string
  label: Localized
  /** Сколько раз скрипт открывали за период. */
  views: number
  /** Сколько раз оператор отметил исход. */
  marked: number
  success: number
  callback: number
  lost: number
  lastMarked: string | null
}

/**
 * Эффективность скриптов за последние `days` дней.
 *
 * Возвращает и открытия, и отметки: без первого числа доля успеха
 * нечитаема — 100% на трёх отметках не значит ничего.
 */
export async function fetchOutcomeSummary(days = 30): Promise<OutcomeRow[]> {
  const { data, error } = await db().rpc('outcome_summary', { p_days: days })
  if (error) throw error
  const rows = (data ?? []) as {
    objection_id: string
    label: Localized
    views: number
    marked: number
    success: number
    callback: number
    lost: number
    last_marked: string | null
  }[]
  return rows.map((r) => ({
    objectionId: r.objection_id,
    label: r.label ?? {},
    views: Number(r.views),
    marked: Number(r.marked),
    success: Number(r.success),
    callback: Number(r.callback),
    lost: Number(r.lost),
    lastMarked: r.last_marked,
  }))
}

/** Запись журнала входов. */
export interface LoginRow {
  id: string
  email: string
  loggedAt: string
}

/** Последние входы операторов (только для админа). */
export async function fetchAgentLogins(limit = 100): Promise<LoginRow[]> {
  const { data, error } = await db()
    .from('agent_logins')
    .select('id,email,logged_at')
    .order('logged_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as { id: string; email: string; logged_at: string }[]).map(
    (r) => ({ id: r.id, email: r.email, loggedAt: r.logged_at }),
  )
}

/* ─────────────── Общий поиск ─────────────── */

/** Что нашлось: возражение, скрипт, ветка или элемент раздела. */
export type SearchKind = 'objection' | 'script' | 'branch' | 'entry'

export interface SearchHit {
  kind: SearchKind
  objectionId: string | null
  stageId: string | null
  section: SectionId | null
  title: string
  /** Кусок текста вокруг совпадения. */
  snippet: string
}

/**
 * Сквозной поиск по возражениям, скриптам, веткам и разделам.
 *
 * Считается в базе: выгружать весь контент в браузер ради подстроки —
 * и медленно, и лишний повод отдать наружу то, что оператору не положено.
 */
export async function searchContent(q: string, lang: string): Promise<SearchHit[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const { data, error } = await db().rpc('search_content', {
    p_q: query,
    p_lang: lang,
  })
  if (error) throw error
  return ((data ?? []) as {
    kind: SearchKind
    objection_id: string | null
    stage_id: string | null
    section: SectionId | null
    title: string
    snippet: string
  }[]).map((r) => ({
    kind: r.kind,
    objectionId: r.objection_id,
    stageId: r.stage_id,
    section: r.section,
    title: r.title,
    snippet: r.snippet,
  }))
}

/* ─────────────── Что нового ─────────────── */

export interface ChangeRow {
  kind: 'objection' | 'script'
  objectionId: string
  stageId: string | null
  title: string
  changedAt: string
  /** Появилось впервые, а не переписано. */
  isNew: boolean
}

/** Что изменилось с момента последнего визита оператора. */
export async function fetchRecentChanges(
  since: string,
  lang: string,
): Promise<ChangeRow[]> {
  const { data, error } = await db().rpc('recent_changes', {
    p_since: since,
    p_lang: lang,
  })
  if (error) throw error
  return ((data ?? []) as {
    kind: 'objection' | 'script'
    objection_id: string
    stage_id: string | null
    title: string
    changed_at: string
    is_new: boolean
  }[]).map((r) => ({
    kind: r.kind,
    objectionId: r.objection_id,
    stageId: r.stage_id,
    title: r.title,
    changedAt: r.changed_at,
    isNew: r.is_new,
  }))
}

/* ─────────────── Личные заметки ─────────────── */

/** Заметка оператора к паре «возражение × этап». Видна только автору. */
export async function fetchNote(
  agentEmail: string,
  objectionId: string,
  stageId: string,
): Promise<string> {
  const { data, error } = await db()
    .from('agent_notes')
    .select('body')
    .eq('agent_email', agentEmail.toLowerCase())
    .eq('objection_id', objectionId)
    .eq('stage_id', stageId)
    .maybeSingle()
  if (error) throw error
  return (data as { body: string } | null)?.body ?? ''
}

/** Сохранить заметку; пустой текст удаляет её. */
export async function saveNote(input: {
  agentEmail: string
  objectionId: string
  stageId: string
  body: string
}): Promise<void> {
  const email = input.agentEmail.toLowerCase()
  const body = input.body.trim()
  if (!body) {
    const { error } = await db()
      .from('agent_notes')
      .delete()
      .eq('agent_email', email)
      .eq('objection_id', input.objectionId)
      .eq('stage_id', input.stageId)
    if (error) throw error
    return
  }
  const { error } = await db().from('agent_notes').upsert(
    {
      agent_email: email,
      objection_id: input.objectionId,
      stage_id: input.stageId,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agent_email,objection_id,stage_id' },
  )
  if (error) throw error
}

/* ─────────────── Теги ─────────────── */

export interface Tag {
  id: string
  slug: string
  label: Localized
  sortOrder: number
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await db().from('tags').select('*').order('sort_order')
  if (error) throw error
  return ((data ?? []) as {
    id: string
    slug: string
    label: Localized
    sort_order: number
  }[]).map((r) => ({
    id: r.id,
    slug: r.slug,
    label: r.label ?? {},
    sortOrder: r.sort_order,
  }))
}

/** Связи «возражение ↔ тег». Отдаём плоским списком: их немного. */
export async function fetchObjectionTags(): Promise<
  { objectionId: string; tagId: string }[]
> {
  const { data, error } = await db().from('objection_tags').select('*')
  if (error) throw error
  return ((data ?? []) as { objection_id: string; tag_id: string }[]).map((r) => ({
    objectionId: r.objection_id,
    tagId: r.tag_id,
  }))
}

export async function saveTag(tag: {
  id?: string
  slug: string
  label: Localized
  sortOrder: number
}): Promise<void> {
  const row = {
    slug: tag.slug,
    label: tag.label,
    sort_order: tag.sortOrder,
    updated_at: new Date().toISOString(),
  }
  const { error } = tag.id
    ? await db().from('tags').update(row).eq('id', tag.id)
    : await db().from('tags').insert(row)
  if (error) throw error
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await db().from('tags').delete().eq('id', id)
  if (error) throw error
}

/** Заменить набор тегов возражения целиком. */
export async function setObjectionTags(
  objectionId: string,
  tagIds: string[],
): Promise<void> {
  const del = await db()
    .from('objection_tags')
    .delete()
    .eq('objection_id', objectionId)
  if (del.error) throw del.error
  if (tagIds.length === 0) return
  const { error } = await db()
    .from('objection_tags')
    .insert(tagIds.map((tagId) => ({ objection_id: objectionId, tag_id: tagId })))
  if (error) throw error
}

/* ─────────────── Оценка скрипта ─────────────── */

export type Vote = 'up' | 'down'

/** Свой голос по скрипту; null — оператор ещё не голосовал. */
export async function fetchMyVote(
  agentEmail: string,
  objectionId: string,
  stageId: string,
  lang: string,
): Promise<Vote | null> {
  const { data, error } = await db()
    .from('script_votes')
    .select('vote')
    .eq('agent_email', agentEmail.toLowerCase())
    .eq('objection_id', objectionId)
    .eq('stage_id', stageId)
    .eq('lang', lang)
    .maybeSingle()
  if (error) throw error
  return (data as { vote: Vote } | null)?.vote ?? null
}

/**
 * Поставить или снять голос. Голос один на оператора и переголосовывается:
 * это его мнение, а не журнал, и менять своё мнение — нормально. Чужие
 * голоса при этом недоступны, за этим следит RLS.
 */
export async function saveVote(input: {
  agentEmail: string
  objectionId: string
  stageId: string
  lang: string
  vote: Vote | null
}): Promise<void> {
  const email = input.agentEmail.toLowerCase()
  const where = {
    agent_email: email,
    objection_id: input.objectionId,
    stage_id: input.stageId,
    lang: input.lang,
  }
  if (!input.vote) {
    const { error } = await db()
      .from('script_votes')
      .delete()
      .match(where)
    if (error) throw error
    return
  }
  const { error } = await db()
    .from('script_votes')
    .upsert(
      { ...where, vote: input.vote, updated_at: new Date().toISOString() },
      { onConflict: 'agent_email,objection_id,stage_id,lang' },
    )
  if (error) throw error
}

/** Предложить правку текста. Запись неизменяемая: админ только меняет статус. */
export async function sendSuggestion(input: {
  agentEmail: string | null
  objectionId: string
  stageId: string
  lang: string
  body: string
}): Promise<void> {
  const body = input.body.trim()
  if (!body) return
  const { error } = await db().from('script_suggestions').insert({
    agent_email: input.agentEmail?.toLowerCase() ?? null,
    objection_id: input.objectionId,
    stage_id: input.stageId,
    lang: input.lang,
    body,
  })
  if (error) throw error
}

export interface FeedbackRow {
  objectionId: string
  stageId: string
  label: Localized
  stageLabel: Localized
  up: number
  down: number
  suggestions: number
}

/** Сводка оценок по скриптам за период. */
export async function fetchFeedbackSummary(days = 90): Promise<FeedbackRow[]> {
  const { data, error } = await db().rpc('feedback_summary', { p_days: days })
  if (error) throw error
  return ((data ?? []) as {
    objection_id: string
    stage_id: string
    label: Localized
    stage_label: Localized
    up: number
    down: number
    suggestions: number
  }[]).map((r) => ({
    objectionId: r.objection_id,
    stageId: r.stage_id,
    label: r.label ?? {},
    stageLabel: r.stage_label ?? {},
    up: Number(r.up),
    down: Number(r.down),
    suggestions: Number(r.suggestions),
  }))
}

export type SuggestionStatus = 'new' | 'done' | 'dismissed'

export interface SuggestionRow {
  id: string
  agentEmail: string | null
  objectionId: string
  stageId: string
  lang: string
  body: string
  status: SuggestionStatus
  createdAt: string
}

export async function fetchSuggestions(
  status: SuggestionStatus = 'new',
): Promise<SuggestionRow[]> {
  const { data, error } = await db()
    .from('script_suggestions')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return ((data ?? []) as {
    id: string
    agent_email: string | null
    objection_id: string
    stage_id: string
    lang: string
    body: string
    status: SuggestionStatus
    created_at: string
  }[]).map((r) => ({
    id: r.id,
    agentEmail: r.agent_email,
    objectionId: r.objection_id,
    stageId: r.stage_id,
    lang: r.lang,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function setSuggestionStatus(
  id: string,
  status: SuggestionStatus,
): Promise<void> {
  const { error } = await db()
    .from('script_suggestions')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/* ─────────────── ИИ-подсказки ─────────────── */

export interface AiSuggestion {
  variants: string[]
  model: string
  /** Сколько генераций израсходовано за час и каков лимит. */
  used: number
  limit: number
}

/**
 * Черновики ответа на возражение.
 *
 * Ходит в edge-функцию, а не к провайдеру напрямую: ключ модели живёт на
 * сервере и в браузерный бандл не попадает. Функция ничего не публикует —
 * решает человек.
 */
export async function suggestRebuttals(input: {
  objectionId: string
  stageId: string
  lang: string
}): Promise<AiSuggestion> {
  const { data, error } = await db().functions.invoke('suggest-rebuttals', {
    body: input,
  })
  if (error) {
    // Текст ошибки лежит в теле ответа: без него админ видел бы только
    // «non-2xx» и гадал, дело в ключе, в модели или в правах.
    const detail = await readFunctionError(error)
    throw new Error(detail ?? error.message)
  }
  const payload = data as Partial<AiSuggestion> & { error?: string }
  if (payload?.error) throw new Error(payload.error)
  return {
    variants: payload?.variants ?? [],
    model: payload?.model ?? '',
    used: payload?.used ?? 0,
    limit: payload?.limit ?? 0,
  }
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const res = (error as { context?: Response })?.context
  if (!res || typeof res.json !== 'function') return null
  try {
    const body = (await res.json()) as { error?: string }
    return body?.error ?? null
  } catch {
    return null
  }
}

/* ─────────────── Актуальность ─────────────── */

export interface StaleRow {
  rebuttalId: string
  objectionId: string
  stageId: string
  label: Localized
  stageLabel: Localized
  langs: string[]
  updatedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  /** Текст правили после последней проверки — повод свериться заново. */
  changedAfter: boolean
  daysSince: number | null
}

export async function fetchStaleScripts(days = 90): Promise<StaleRow[]> {
  const { data, error } = await db().rpc('stale_scripts', { p_days: days })
  if (error) throw error
  return ((data ?? []) as {
    rebuttal_id: string
    objection_id: string
    stage_id: string
    label: Localized
    stage_label: Localized
    langs: string[] | null
    updated_at: string
    reviewed_at: string | null
    reviewed_by: string | null
    changed_after: boolean
    days_since: number | null
  }[]).map((r) => ({
    rebuttalId: r.rebuttal_id,
    objectionId: r.objection_id,
    stageId: r.stage_id,
    label: r.label ?? {},
    stageLabel: r.stage_label ?? {},
    langs: r.langs ?? [],
    updatedAt: r.updated_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
    changedAfter: r.changed_after,
    daysSince: r.days_since === null ? null : Number(r.days_since),
  }))
}

/** Отметить, что скрипт сверили с текущими условиями. */
export async function markReviewed(rebuttalId: string): Promise<void> {
  const { error } = await db().rpc('mark_reviewed', { p_rebuttal_id: rebuttalId })
  if (error) throw error
}

/* ─────────────── Копия на другой язык ─────────────── */

/**
 * Скопировать тексты возражения из одного языка в другой.
 * Заполняет только пустые места и помечает язык как непереведённый,
 * чтобы копия не ушла оператору вместо перевода.
 */
export async function cloneObjectionLang(
  objectionId: string,
  fromLang: string,
  toLang: string,
): Promise<void> {
  const { error } = await db().rpc('clone_objection', {
    p_objection_id: objectionId,
    p_from_lang: fromLang,
    p_to_lang: toLang,
  })
  if (error) throw error
}

/** Пара «возражение × этап», для которой есть опубликованный скрипт. */
export interface RebuttalIndexEntry {
  objectionId: string
  stageId: string
  /** Языки, на которых ответ реально заполнен. */
  langs: string[]
}

/**
 * Лёгкий индекс существующих скриптов (без текстов) — чтобы на шаге «Этап»
 * показывать агенту только те этапы, где ответ действительно есть.
 */
export async function fetchRebuttalIndex(): Promise<RebuttalIndexEntry[]> {
  const { data, error } = await db().rpc('rebuttal_index')
  if (error) throw error
  const rows = (data ?? []) as {
    objection_id: string
    stage_id: string
    langs: string[] | null
  }[]
  return rows.map((r) => ({
    objectionId: r.objection_id,
    stageId: r.stage_id,
    langs: r.langs ?? [],
  }))
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

/**
 * Создать возражение и вернуть его id.
 *
 * Отдельно от saveObjection(), потому что импорту нужен id только что
 * созданной записи, чтобы сразу привязать к ней скрипт и ветки.
 */
export async function createObjectionReturningId(
  input: TermInput,
): Promise<string> {
  const { data, error } = await db()
    .from('objections')
    .insert(termRow(input))
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
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

/* ─────────────── Агенты (белый список email для OTP-входа) ─────────────── */

export interface AgentEmail {
  email: string
  note: string | null
  createdAt: string
}

interface AgentEmailRow {
  email: string
  note: string | null
  created_at: string
}

/** Список разрешённых email агентов. Чтение доступно только админам (RLS). */
export async function fetchAgentEmails(): Promise<AgentEmail[]> {
  const { data, error } = await db()
    .from('agent_emails')
    .select('*')
    .order('created_at')
  if (error) throw error
  return (data as AgentEmailRow[]).map((r) => ({
    email: r.email,
    note: r.note,
    createdAt: r.created_at,
  }))
}

export async function saveAgentEmail(input: {
  email: string
  note: string | null
}): Promise<void> {
  const { error } = await db()
    .from('agent_emails')
    .upsert(
      { email: input.email, note: input.note },
      { onConflict: 'email' },
    )
  if (error) throw error
}

export async function deleteAgentEmail(email: string): Promise<void> {
  const { error } = await db().from('agent_emails').delete().eq('email', email)
  if (error) throw error
}
