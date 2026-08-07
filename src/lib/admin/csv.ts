import 'server-only'

/**
 * Minimal RFC 4180 CSV writer.
 *
 * The BOM matters: without it Excel opens UTF-8 exports as Windows-1252 and
 * mangles names and the Rs symbol. The leading apostrophe guard stops a cell
 * beginning with =, +, - or @ from being executed as a formula when the export
 * is opened in a spreadsheet.
 */
const BOM = '﻿'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''

  let text = value instanceof Date ? value.toISOString() : String(value)

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return BOM + lines.join('\r\n')
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
