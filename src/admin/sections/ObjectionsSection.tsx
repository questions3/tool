import type { Language, Objection } from '../../types'
import { deleteObjection, saveObjection } from '../../data/repository'
import { TermSection } from './TermSection'

interface Props {
  lang: string
  languages: Language[]
  objections: Objection[]
  onChanged: () => Promise<void>
}

export function ObjectionsSection({
  lang,
  languages,
  objections,
  onChanged,
}: Props) {
  return (
    <TermSection
      title="Возражения"
      singular="возражение"
      lang={lang}
      languages={languages}
      items={objections}
      onSave={saveObjection}
      onDelete={deleteObjection}
      onChanged={onChanged}
    />
  )
}
