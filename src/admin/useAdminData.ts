import { useCallback, useEffect, useState } from 'react'
import type { Language, Objection, Rebuttal, Stage } from '../types'
import {
  fetchAgentEmails,
  fetchLanguages,
  fetchObjections,
  fetchRebuttals,
  fetchStages,
  type AgentEmail,
} from '../data/repository'

export interface AdminData {
  loading: boolean
  error: string | null
  languages: Language[]
  objections: Objection[]
  stages: Stage[]
  rebuttals: Rebuttal[]
  agentEmails: AgentEmail[]
  reload: () => Promise<void>
}

/**
 * Загружает все сущности для админки одним заходом. После любой мутации
 * секции вызывают `reload()`, чтобы подтянуть свежие данные.
 *
 * В отличие от useContent (приложение агента) здесь грузятся ВСЕ записи,
 * включая выключенные (`is_enabled = false`), — админ должен их видеть.
 */
export function useAdminData(): AdminData {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [languages, setLanguages] = useState<Language[]>([])
  const [objections, setObjections] = useState<Objection[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [rebuttals, setRebuttals] = useState<Rebuttal[]>([])
  const [agentEmails, setAgentEmails] = useState<AgentEmail[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [langs, objs, stgs, rebs, agents] = await Promise.all([
        fetchLanguages(),
        fetchObjections(),
        fetchStages(),
        fetchRebuttals(),
        fetchAgentEmails(),
      ])
      setLanguages(langs)
      setObjections(objs)
      setStages(stgs)
      setRebuttals(rebs)
      setAgentEmails(agents)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    loading,
    error,
    languages,
    objections,
    stages,
    rebuttals,
    agentEmails,
    reload,
  }
}
