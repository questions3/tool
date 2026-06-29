import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase-клиент создаётся из публичных env-переменных
 * (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
 *
 * Если переменные не заданы — экспортируем `null`. В этом режиме приложение
 * агента откатывается на встроенный статический контент (`src/data/content.ts`),
 * а админ-панель показывает предупреждение «Supabase не настроен». Это позволяет
 * запускать и собирать проект локально без подключённой БД.
 */

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** true — если обе env-переменные Supabase заданы. */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null
