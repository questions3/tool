/**
 * Разбор .docx и .xlsx прямо в браузере.
 *
 * Оба формата — обычные zip-архивы с XML внутри. Распаковка сделана на
 * штатных DecompressionStream и DOMParser, поэтому в проект не добавлено
 * ни одной зависимости: ни mammoth/SheetJS, ни даже zip-библиотеки.
 *
 * Ожидаемая структура файла (та же, в которой заказчик присылает скрипты):
 *   Название возражения
 *   Метка варианта:      ← например «Ask Probing Questions» или «Вариант 2»
 *   Текст ответа
 *   Метка варианта:
 *   Текст ответа
 *   …
 * Первый вариант становится базовым скриптом, остальные — ветками what-if.
 */

/** Один распознанный вариант ответа. */
export interface ParsedItem {
  label: string
  text: string
}

/** Результат разбора файла. */
export interface ParsedDoc {
  /** Название возражения (заголовок документа / первая ячейка). */
  title: string
  items: ParsedItem[]
  /** Что именно распознали — показываем в предпросмотре. */
  source: 'docx' | 'xlsx'
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/** Абзац Word: текст + признак «жирный» (жирным размечены заголовки). */
interface Para {
  text: string
  bold: boolean
}

export async function parseFile(file: File): Promise<ParsedDoc> {
  const name = file.name.toLowerCase()
  const buf = new Uint8Array(await file.arrayBuffer())
  const zip = await readZip(buf)

  if (name.endsWith('.docx')) return parseDocx(zip)
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return parseXlsx(zip)

  throw new Error('Поддерживаются только файлы .docx и .xlsx')
}

// ---------------------------------------------------------------- docx

function parseDocx(zip: Zip): ParsedDoc {
  const xml = zip['word/document.xml'] ?? null
  if (!xml) throw new Error('Это не похоже на документ Word: нет word/document.xml')

  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const paras: Para[] = []

  for (const p of Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))) {
    const text = Array.from(p.getElementsByTagNameNS(W_NS, 't'))
      .map((t) => t.textContent ?? '')
      .join('')
      .trim()
    if (!text) continue
    // Абзац считаем заголовком, если хотя бы один прогон помечен <w:b/>.
    const bold = p.getElementsByTagNameNS(W_NS, 'b').length > 0
    paras.push({ text, bold })
  }

  if (paras.length === 0) throw new Error('В документе не найдено текста')

  // Первый абзац — название возражения. Убираем нумерацию («2. ») и кавычки.
  const title = cleanTitle(paras[0].text)

  // Иногда заголовок и первая метка слиты в один абзац:
  //   «"I'm not interested."Ask Probing Questions:»
  // Отделяем хвост после закрывающей кавычки — это первая метка.
  const rest = paras.slice(1)
  const glued = splitGluedLabel(paras[0].text)
  if (glued) rest.unshift({ text: glued, bold: false })

  return { title, items: pairLabelsAndText(rest), source: 'docx' }
}

/** «"Заголовок."Метка:» → «Метка», иначе null. */
function splitGluedLabel(raw: string): string | null {
  const q = raw.lastIndexOf('"')
  if (q === -1 || q === raw.length - 1) return null
  const tail = raw.slice(q + 1).trim()
  return tail.length > 1 ? tail : null
}

// ---------------------------------------------------------------- xlsx

function parseXlsx(zip: Zip): ParsedDoc {
  const sheet =
    zip['xl/worksheets/sheet1.xml'] ?? zip['xl/worksheets/Sheet1.xml'] ?? null
  if (!sheet) throw new Error('Это не похоже на книгу Excel: нет листа')

  const shared = readSharedStrings(zip)
  const doc = new DOMParser().parseFromString(sheet, 'application/xml')

  // Собираем колонки A и B построчно — в этом виде приходят таблицы скриптов.
  const rows: { a: string; b: string }[] = []
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    let a = ''
    let b = ''
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r') ?? ''
      const col = ref.replace(/\d+/g, '')
      const val = cellValue(c, shared)
      if (col === 'A') a = val
      else if (col === 'B') b = val
    }
    if (a.trim() || b.trim()) rows.push({ a: a.trim(), b: b.trim() })
  }

  if (rows.length === 0) throw new Error('На листе не найдено данных')

  // Шапку («Категория | Скрипт ответа») пропускаем.
  const body = /категор|scrypt|скрипт|category/i.test(rows[0].a + rows[0].b)
    ? rows.slice(1)
    : rows

  const first = body.find((r) => r.a && !r.b)
  const title = cleanTitle(first?.a ?? body[0]?.a ?? 'Без названия')

  const items: ParsedItem[] = []
  for (const r of body) {
    if (!r.b) continue // строка-заголовок без текста
    items.push({ label: r.a || `Вариант ${items.length + 1}`, text: r.b })
  }

  return { title, items, source: 'xlsx' }
}

function readSharedStrings(zip: Zip): string[] {
  const xml = zip['xl/sharedStrings.xml']
  if (!xml) return []
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return Array.from(doc.getElementsByTagName('si')).map((si) =>
    Array.from(si.getElementsByTagName('t'))
      .map((t) => t.textContent ?? '')
      .join(''),
  )
}

function cellValue(c: Element, shared: string[]): string {
  const type = c.getAttribute('t')
  if (type === 's') {
    const idx = Number(c.getElementsByTagName('v')[0]?.textContent ?? -1)
    return shared[idx] ?? ''
  }
  if (type === 'inlineStr') {
    return Array.from(c.getElementsByTagName('t'))
      .map((t) => t.textContent ?? '')
      .join('')
  }
  return c.getElementsByTagName('v')[0]?.textContent ?? ''
}

// ---------------------------------------------------------------- общее

/** Распакованный архив: путь внутри zip → содержимое как текст. */
type Zip = Record<string, string>

/**
 * Минимальный распаковщик zip.
 *
 * Читаем только то, что нужно для OOXML: идём по локальным заголовкам
 * (сигнатура PK\x03\x04), берём имя и данные. Сжатые записи (метод 8,
 * deflate) разворачиваем нативным DecompressionStream — отдельная
 * zip-библиотека для этого не нужна.
 */
async function readZip(buf: Uint8Array): Promise<Zip> {
  const out: Zip = {}
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const decoder = new TextDecoder()
  let i = 0

  while (i + 30 <= buf.length) {
    if (view.getUint32(i, true) !== 0x04034b50) break // не локальный заголовок

    const method = view.getUint16(i + 8, true)
    let compressed = view.getUint32(i + 18, true)
    const nameLen = view.getUint16(i + 26, true)
    const extraLen = view.getUint16(i + 28, true)
    const nameStart = i + 30
    const dataStart = nameStart + nameLen + extraLen
    const name = decoder.decode(buf.subarray(nameStart, nameStart + nameLen))

    // Размер в локальном заголовке может быть нулевым (данные идут с
    // data descriptor). Тогда ищем следующую сигнатуру записи.
    if (compressed === 0) {
      const next = findNextSignature(buf, dataStart)
      compressed = Math.max(0, next - dataStart)
    }

    const raw = buf.subarray(dataStart, dataStart + compressed)
    // XML нужен не весь: пропускаем картинки, шрифты и прочий балласт.
    if (name.endsWith('.xml')) {
      try {
        out[name] =
          method === 0 ? decoder.decode(raw) : decoder.decode(await inflate(raw))
      } catch {
        // Повреждённая запись не должна ронять импорт целиком.
      }
    }

    i = dataStart + compressed
    // Пропускаем data descriptor, если он есть.
    if (i + 4 <= buf.length && view.getUint32(i, true) === 0x08074b50) i += 16
  }

  return out
}

/** Смещение следующей записи/центрального каталога, начиная с `from`. */
function findNextSignature(buf: Uint8Array, from: number): number {
  for (let j = from; j + 4 <= buf.length; j++) {
    if (buf[j] !== 0x50 || buf[j + 1] !== 0x4b) continue
    const c = buf[j + 2]
    const d = buf[j + 3]
    // PK\x03\x04 (запись), PK\x01\x02 (каталог), PK\x07\x08 (descriptor)
    if ((c === 3 && d === 4) || (c === 1 && d === 2) || (c === 7 && d === 8)) {
      return j
    }
  }
  return buf.length
}

/** raw deflate → байты, нативным API браузера. */
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Убирает нумерацию списка, кавычки и лишние пробелы из заголовка. */
function cleanTitle(raw: string): string {
  let s = raw.replace(/^[\s\d.)]+/, '').trim()
  // Заголовок часто в кавычках — снимаем и прямые, и типографские.
  s = s.replace(/^["“«„]/, '').replace(/["”»“]$/, '')
  // Если после кавычки прилипла метка первого варианта — отрезаем.
  const q = s.indexOf('"')
  if (q > 0) s = s.slice(0, q)
  // Хвостовой номер варианта («…zainteresowany 1») в название не нужен.
  s = s.replace(/[\s.]+\d+$/, '')
  return s.trim()
}

/**
 * Превращает плоский список абзацев в пары «метка → текст».
 *
 * Меткой считается короткая строка, оканчивающаяся двоеточием, либо
 * «Вариант N» / «Wariant N» / «Variant N». Всё, что идёт следом до
 * очередной метки, склеивается в текст ответа с сохранением абзацев.
 */
function pairLabelsAndText(paras: Para[]): ParsedItem[] {
  const items: ParsedItem[] = []
  let current: ParsedItem | null = null

  for (const p of paras) {
    if (isLabel(p)) {
      current = { label: p.text.replace(/:\s*$/, '').trim(), text: '' }
      items.push(current)
      continue
    }
    if (!current) {
      current = { label: `Вариант ${items.length + 1}`, text: '' }
      items.push(current)
    }
    current.text = current.text ? `${current.text}\n${p.text}` : p.text
  }

  // Варианты без текста бесполезны — выкидываем.
  return items.filter((i) => i.text.trim() !== '')
}

function isLabel(p: Para): boolean {
  const t = p.text.trim()
  if (t.length > 80) return false
  if (/^(вариант|wariant|variant|опция|option)\s*\d+/i.test(t)) return true
  // «Ask Probing Questions:» — короткая строка с двоеточием на конце.
  if (t.endsWith(':') && t.length <= 60) return true
  // Жирный короткий абзац без завершающей точки тоже читаем как метку.
  if (p.bold && t.length <= 60 && !/[.!?]$/.test(t)) return true
  return false
}
