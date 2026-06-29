/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Единый пароль входа агентов. Если не задан — берётся DEFAULT_PASSWORD. */
  readonly VITE_APP_PASSWORD?: string
  /** URL проекта Supabase (Project Settings → API). */
  readonly VITE_SUPABASE_URL?: string
  /** Публичный anon-ключ Supabase (Project Settings → API). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
