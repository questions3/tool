/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL проекта Supabase (Project Settings → API). */
  readonly VITE_SUPABASE_URL?: string
  /** Публичный anon-ключ Supabase (Project Settings → API). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
