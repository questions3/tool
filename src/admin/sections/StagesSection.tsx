import type { Language, Stage } from '../../types'
import { deleteStage, saveStage } from '../../data/repository'
import { TermSection } from './TermSection'

interface Props {
  languages: Language[]
  stages: Stage[]
  onChanged: () => Promise<void>
}

export function StagesSection({ languages, stages, onChanged }: Props) {
  return (
    <TermSection
      title="Этапы разговора"
      singular="этап"
      languages={languages}
      items={stages}
      onSave={saveStage}
      onDelete={deleteStage}
      onChanged={onChanged}
    />
  )
}
