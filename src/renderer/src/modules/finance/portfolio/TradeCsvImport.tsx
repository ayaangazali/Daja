import { useRef, useState } from 'react'
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fromCsv } from '../../../lib/csv'
import { useAddTrade, useTrades, type NewTrade } from '../../../hooks/useTrades'
import { cn } from '../../../lib/cn'

/**
 * CSV trade import. Mirrors the export shape so round-trip works.
 *
 * Expected headers (order-independent, case-insensitive):
 *   date, ticker, side, quantity, price, fees?, currency?, exchange?, notes?
 */

const REQUIRED = ['date', 'ticker', 'side', 'quantity', 'price'] as const
const VALID_SIDES = new Set(['buy', 'sell', 'short', 'cover'])

interface ParsedRow {
  row: number
  trade: NewTrade | null
  errors: string[]
  duplicate: boolean
}

function parseDate(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  // Accept YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(t)) return t.replace(/\//g, '-')
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
    const [m, d, y] = t.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export function TradeCsvImport(): React.JSX.Element {
  const addMut = useAddTrade()
  const { data: existingTrades = [] } = useTrades()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [importedCount, setImportedCount] = useState<number | null>(null)

  const dupKey = (t: {
    date: string
    ticker: string
    side: string
    quantity: number
    price: number
  }): string => `${t.date}|${t.ticker.toUpperCase()}|${t.side}|${t.quantity}|${t.price}`

  const existingKeys = new Set(existingTrades.map((t) => dupKey(t)))

  const onFile = async (file: File): Promise<void> => {
    setImportedCount(null)
    setFileName(file.name)
    // Cap file size — typical portfolio CSVs are < 500 KB; 10 MB is generous.
    // Prevents main-thread stall + memory spike on pathological input.
    if (file.size > 10 * 1024 * 1024) {
      setPreview([
        {
          row: 0,
          trade: null,
          errors: [
            `CSV is ${Math.round(file.size / 1024 / 1024)} MB — exceeds 10 MB import limit. Split it into smaller files or compress duplicate rows first.`
          ],
          duplicate: false
        }
      ])
      return
    }
    const text = await file.text()
    const { header, rows } = fromCsv(text)
    const lowerHeader = header.map((h) => h.trim().toLowerCase())
    const missingReq = REQUIRED.filter((r) => !lowerHeader.includes(r))
    if (missingReq.length > 0) {
      setPreview([
        {
          row: 0,
          trade: null,
          errors: [`Missing required column(s): ${missingReq.join(', ')}`],
          duplicate: false
        }
      ])
      return
    }
    const idx = Object.fromEntries(lowerHeader.map((h, i) => [h, i]))
    const parsed: ParsedRow[] = rows.map((r, i) => {
      const row = i + 2 // header row is 1
      const errors: string[] = []
      const get = (key: string): string => {
        const pos = idx[key]
        return pos == null ? '' : (Object.values(r)[pos] ?? '').trim()
      }
      const dateRaw = get('date')
      const date = parseDate(dateRaw)
      if (!date) errors.push(`date "${dateRaw}" not recognized (use YYYY-MM-DD)`)

      const ticker = get('ticker').toUpperCase()
      if (!ticker) errors.push('ticker empty')

      const side = get('side').toLowerCase() as NewTrade['side']
      if (!VALID_SIDES.has(side)) errors.push(`side "${side}" not in ${[...VALID_SIDES].join(',')}`)

      const qty = Number(get('quantity'))
      if (!Number.isFinite(qty) || qty <= 0) errors.push(`quantity "${get('quantity')}" invalid`)

      const price = Number(get('price'))
      if (!Number.isFinite(price) || price <= 0) errors.push(`price "${get('price')}" invalid`)

      const feesRaw = get('fees')
      const fees = feesRaw === '' ? 0 : Number(feesRaw)
      if (!Number.isFinite(fees) || fees < 0) errors.push(`fees "${feesRaw}" invalid`)

      if (errors.length > 0) {
        return { row, trade: null, errors, duplicate: false }
      }
      const trade: NewTrade = {
        ticker,
        side,
        quantity: qty,
        price,
        fees,
        date: date!,
        notes: get('notes') || null
      }
      const duplicate = existingKeys.has(dupKey({ ...trade, side: trade.side }))
      return { row, trade, errors: [], duplicate }
    })
    setPreview(parsed)
  }

  const importValid = async (): Promise<void> => {
    if (!preview) return
    const toImport = preview.filter((p) => p.trade != null && !p.duplicate).map((p) => p.trade!)
    let success = 0
    for (const t of toImport) {
      try {
        await addMut.mutateAsync(t)
        success += 1
      } catch (err) {
        console.error('import failed row', t, err)
      }
    }
    setImportedCount(success)
    setPreview(null)
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const validCount = preview?.filter((p) => p.trade != null && !p.duplicate).length ?? 0
  const dupCount = preview?.filter((p) => p.duplicate).length ?? 0
  const errorCount = preview?.filter((p) => p.errors.length > 0).length ?? 0

  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <h2 className="text-[13px] font-semibold">Import trades (CSV)</h2>
      <p className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
        Accepts exports from this app and most broker formats. Required columns:{' '}
        <code>date, ticker, side, quantity, price</code>. Optional:{' '}
        <code>fees, currency, exchange, notes</code>. Duplicate trades (same date + ticker + side +
        qty + price) are skipped.
      </p>

      <label className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-[11px] hover:bg-[var(--color-bg)]">
        <Upload className="h-3.5 w-3.5" />
        <span className="flex-1">{fileName || 'Choose a CSV file…'}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
          }}
        />
      </label>

      {importedCount != null && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-[var(--color-pos)]/40 bg-[var(--color-pos)]/10 px-3 py-2 text-[11px] text-[var(--color-pos)]">
          <CheckCircle2 className="h-3 w-3" />
          Imported {importedCount} trade{importedCount === 1 ? '' : 's'}.
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[var(--color-pos)]">{validCount} valid</span>
            <span className="text-[var(--color-warn)]">{dupCount} duplicates</span>
            <span className="text-[var(--color-neg)]">{errorCount} errors</span>
          </div>
          <div className="max-h-60 overflow-y-auto rounded border border-[var(--color-border)] text-[11px]">
            {preview.slice(0, 50).map((p) => (
              <div
                key={p.row}
                className={cn(
                  'flex items-center gap-2 border-b border-[var(--color-border)] px-2 py-1 last:border-0',
                  p.errors.length > 0 && 'bg-[var(--color-neg)]/5',
                  p.duplicate && 'bg-[var(--color-warn)]/5'
                )}
              >
                <span className="w-10 font-mono tabular text-[10px] text-[var(--color-fg-muted)]">
                  L{p.row}
                </span>
                {p.trade ? (
                  <span className="flex-1 truncate font-mono tabular text-[10px]">
                    {p.trade.date} · {p.trade.ticker} · {p.trade.side} · {p.trade.quantity} @ $
                    {p.trade.price}
                  </span>
                ) : (
                  <span className="flex-1 text-[var(--color-neg)]">{p.errors.join(', ')}</span>
                )}
                {p.duplicate && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--color-warn)]">
                    <AlertTriangle className="h-3 w-3" /> duplicate
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setPreview(null)
                setFileName('')
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[11px] hover:bg-[var(--color-bg)]"
            >
              Cancel
            </button>
            <button
              onClick={() => void importValid()}
              disabled={validCount === 0 || addMut.isPending}
              className="rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
            >
              {addMut.isPending ? 'Importing…' : `Import ${validCount} valid`}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
