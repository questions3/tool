import { useCallback, useEffect, useState } from 'react'

const KEY = 'convvy.favorites'

/**
 * Избранные возражения оператора.
 *
 * Хранится в localStorage: это личная настройка конкретного человека на
 * конкретном устройстве, её незачем синхронизировать через БД и незачем
 * показывать администратору. Ключи — id возражений.
 */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => read())

  // Синхронизация между вкладками: пометил в одной — видно в другой.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setIds(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
      write(next)
      return next
    })
  }, [])

  const has = useCallback((id: string) => ids.includes(id), [ids])

  return { favorites: ids, isFavorite: has, toggleFavorite: toggle }
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    // Приватный режим, переполненное или испорченное хранилище — не падаем.
    return []
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Не критично: избранное просто не переживёт перезагрузку.
  }
}
