import { useCallback, useEffect, useRef, useState } from 'react'
import { logOutcome } from '../data/repository'
import type { Outcome } from '../types'

/**
 * Сколько времени даём оператору переиграть отметку до записи в базу.
 *
 * Таблица script_outcomes только на добавление — исправить строку потом
 * нельзя. Поэтому промах по кнопке не пишем сразу: показываем «Отмечено»
 * мгновенно, а в базу уходит то, что осталось выбранным через эту паузу.
 * Иначе одна исправленная отметка давала бы две записи и завышала выборку.
 */
const GRACE_MS = 6000

interface Ctx {
  objectionId: string
  stageId: string
  lang: string
  agentEmail: string | null
  /** Выключено, когда нет базы или оператор не вошёл. */
  enabled: boolean
}

/**
 * Отметка исхода разговора для открытого скрипта.
 *
 * Возвращает выбранный вариант и функцию выбора; `pick(null)` возвращает
 * строку кнопок, пока запись не ушла. Отложенная запись досылается при
 * уходе с экрана — иначе отметка перед самым переходом потерялась бы.
 */
export function useOutcome(ctx: Ctx) {
  const [picked, setPicked] = useState<Outcome | null>(null)

  // Последний контекст — чтобы pick оставался стабильной функцией.
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  // Отложенная запись со снимком контекста на момент нажатия: пока идёт
  // пауза, оператор может уже уйти на другой скрипт.
  const pending = useRef<{ outcome: Outcome; ctx: Ctx } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const p = pending.current
    pending.current = null
    if (!p) return
    // Телеметрия не должна мешать работать: ошибку глушим.
    void logOutcome({
      objectionId: p.ctx.objectionId,
      stageId: p.ctx.stageId,
      lang: p.ctx.lang,
      outcome: p.outcome,
      agentEmail: p.ctx.agentEmail,
    }).catch(() => {})
  }, [])

  const pick = useCallback(
    (outcome: Outcome | null) => {
      setPicked(outcome)
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (!outcome || !ctxRef.current.enabled) {
        pending.current = null
        return
      }
      pending.current = { outcome, ctx: ctxRef.current }
      timer.current = setTimeout(flush, GRACE_MS)
    },
    [flush],
  )

  // Смена скрипта — начинаем с чистого листа, отложенное дописываем.
  const key = `${ctx.objectionId}:${ctx.stageId}:${ctx.lang}`
  useEffect(() => {
    setPicked(null)
    return flush
  }, [key, flush])

  // Закрытая вкладка тоже не должна съедать отметку.
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [flush])

  return { picked, pick }
}
