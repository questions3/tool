/**
 * Отклоняет промис, если он не завершился за `ms` миллисекунд.
 * Защита от «зависших» сетевых запросов (напр. приостановленный проект
 * Supabase отвечает по TCP, но не закрывает запрос) — без этого экран
 * грузки мог бы висеть бесконечно.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(id)
        resolve(value)
      },
      (err) => {
        clearTimeout(id)
        reject(err)
      },
    )
  })
}
