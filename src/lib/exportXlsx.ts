/**
 * Сборка книги .xlsx прямо в браузере.
 *
 * Обратная сторона importDoc.ts и, как и он, без единой зависимости.
 * Записи кладём в zip без сжатия (метод 0) — тогда не нужен ни
 * CompressionStream, ни его асинхронность: только CRC32 и заголовки.
 * Книга контента весит десятки килобайт, экономить тут не на чем.
 */

export interface Sheet {
  /** Имя листа. Excel запрещает : \ / ? * [ ] и больше 31 символа. */
  name: string
  /** Первая строка — заголовки. Значения пишутся как текст. */
  rows: string[][]
}

export function buildXlsx(sheets: Sheet[]): Blob {
  const safe = sheets.map((s, i) => ({
    name: sheetName(s.name, i),
    rows: s.rows,
  }))

  const files: [string, string][] = [
    ['[Content_Types].xml', contentTypes(safe.length)],
    ['_rels/.rels', rootRels()],
    ['xl/workbook.xml', workbook(safe.map((s) => s.name))],
    ['xl/_rels/workbook.xml.rels', workbookRels(safe.length)],
    ...safe.map(
      (s, i) => [`xl/worksheets/sheet${i + 1}.xml`, worksheet(s.rows)] as [string, string],
    ),
  ]

  return zip(files)
}

/** Готовое имя листа: без запрещённых символов и не длиннее 31 знака. */
function sheetName(raw: string, index: number): string {
  const cleaned = raw.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31)
  return cleaned || `Лист${index + 1}`
}

/* ─────────────── XML частей книги ─────────────── */

const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function contentTypes(count: number): string {
  const sheets = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')
  return `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets}</Types>`
}

function rootRels(): string {
  return `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
}

function workbook(names: string[]): string {
  const sheets = names
    .map(
      (n, i) =>
        `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('')
  return `${HEAD}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${sheets}</sheets></workbook>`
}

function workbookRels(count: number): string {
  const rels = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('')
  return `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
}

function worksheet(rows: string[][]): string {
  const body = rows
    .map((cells, r) => {
      const tds = cells
        .map((v, c) =>
          v === ''
            ? ''
            : `<c r="${colRef(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`,
        )
        .join('')
      return `<row r="${r + 1}">${tds}</row>`
    })
    .join('')
  return `${HEAD}<worksheet xmlns="${NS}"><sheetData>${body}</sheetData></worksheet>`
}

/** 0 → A, 25 → Z, 26 → AA. */
function colRef(index: number): string {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Управляющие символы недопустимы в XML и роняют открытие книги.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

/* ─────────────── Минимальный zip-упаковщик ─────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zip(files: [string, string][]): Blob {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const [name, text] of files) {
    const nameBytes = enc.encode(name)
    const data = enc.encode(text)
    const sum = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // версия
    lv.setUint16(6, 0x0800, true) // имена в UTF-8
    lv.setUint16(8, 0, true) // без сжатия
    lv.setUint32(14, sum, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)

    const dir = new Uint8Array(46 + nameBytes.length)
    const dv = new DataView(dir.buffer)
    dv.setUint32(0, 0x02014b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 20, true)
    dv.setUint16(8, 0x0800, true)
    dv.setUint16(10, 0, true)
    dv.setUint32(16, sum, true)
    dv.setUint32(20, data.length, true)
    dv.setUint32(24, data.length, true)
    dv.setUint16(28, nameBytes.length, true)
    dv.setUint32(42, offset, true)
    dir.set(nameBytes, 46)

    parts.push(local, data)
    central.push(dir)
    offset += local.length + data.length
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end] as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Сохранить книгу под именем. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Освобождаем сразу: ссылка уже сработала, держать её незачем.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
