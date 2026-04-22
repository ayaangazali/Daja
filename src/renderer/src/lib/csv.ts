export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return ''
  const keys = (columns ?? (Object.keys(rows[0]) as (keyof T)[])) as (keyof T)[]
  const esc = (v: unknown): string => {
    if (v == null) return ''
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = keys.map(String).join(',')
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(',')).join('\n')
  return `${header}\n${body}`
}

export async function downloadCsv(filename: string, content: string): Promise<boolean> {
  const res = await window.daja.system.saveFile({
    defaultPath: filename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    contents: content
  })
  return res.ok
}
