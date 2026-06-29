/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Единый пароль входа. Если не задан — берётся DEFAULT_PASSWORD. */
  readonly VITE_APP_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
