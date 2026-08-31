import { useState } from 'react'
import { suggestRebuttals } from '../../data/repository'
import { IconSparkle } from '../../components/icons'

interface Props {
  objectionId: string
  stageId: string
  lang: string
  /** Вставить выбранный черновик в поле ответа. */
  onUse: (text: string) => void
}

/**
 * Черновики ответа от модели.
 *
 * Это инструмент наполнения, а не суфлёр в звонке: оператор ничего
 * сгенерированного не видит, пока администратор не отредактирует текст и
 * не сохранит его обычным способом. Автопубликации нет ни в каком виде —
 * в колл-центре финансовой тематики модель может выдумать условие или
 * цифру, и оператор прочитает это клиенту вслух.
 */
export function AiSuggest({ objectionId, stageId, lang, onUse }: Props) {
  const [variants, setVariants] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<string | null>(null)

  const ready = Boolean(objectionId && stageId)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const r = await suggestRebuttals({ objectionId, stageId, lang })
      setVariants(r.variants)
      setMeta(
        r.variants.length
          ? `${r.model} · ${r.used} из ${r.limit} генераций за час`
          : null,
      )
      if (r.variants.length === 0) setError('Модель вернула пустой ответ.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setVariants([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <IconSparkle size={16} className="text-accent" />
            Черновики от модели
          </h4>
          <p className="mt-0.5 text-xs text-ink-3">
            Подсказка для вас, а не для оператора: пока вы не сохраните
            текст, в приложении его нет.
          </p>
        </div>
        <button
          onClick={() => void run()}
          disabled={busy || !ready}
          className="shrink-0 rounded-lg border border-accent-line bg-white px-3 py-1.5 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent-soft disabled:opacity-50"
        >
          {busy ? 'Думает…' : 'Предложить варианты'}
        </button>
      </div>

      {error && (
        <p className="mt-3 whitespace-pre-line rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {variants.length > 0 && (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {variants.map((v, i) => (
              <li
                key={i}
                className="rounded-lg border border-line bg-white px-4 py-3"
              >
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                  {v}
                </p>
                <button
                  onClick={() => onUse(v)}
                  className="mt-2 rounded-md bg-accent px-3 py-1 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
                >
                  Взять за основу
                </button>
              </li>
            ))}
          </ul>
          {meta && <p className="mt-2 text-xs text-ink-3">{meta}</p>}
          <p className="mt-1 text-xs text-ink-3">
            Пропуски в квадратных скобках модель оставляет там, где нужен
            факт: срок, сумма, условие. Их заполняете вы — выдумывать цифры
            ей запрещено промптом, но проверить всё равно нужно.
          </p>
        </>
      )}
    </div>
  )
}
