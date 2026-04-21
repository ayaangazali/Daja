import { useState } from 'react'
import { Download, FilePlus, FileText, Scissors, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Tab = 'merge' | 'split' | 'info'

export function PdfHome(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('merge')
  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-[var(--color-border)]">
        <TabBtn tab="merge" active={tab} onClick={setTab} label="Merge" icon={<FilePlus className="h-3 w-3" />} />
        <TabBtn tab="split" active={tab} onClick={setTab} label="Split" icon={<Scissors className="h-3 w-3" />} />
        <TabBtn tab="info" active={tab} onClick={setTab} label="Info" icon={<FileText className="h-3 w-3" />} />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'merge' && <MergeTab />}
        {tab === 'split' && <SplitTab />}
        {tab === 'info' && <InfoTab />}
      </div>
    </div>
  )
}

function TabBtn({
  tab,
  active,
  onClick,
  label,
  icon
}: {
  tab: Tab
  active: Tab
  onClick: (t: Tab) => void
  label: string
  icon: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={() => onClick(tab)}
      className={cn(
        'flex items-center gap-1 px-3 py-2 text-[11px]',
        active === tab
          ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
          : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
      )}
    >
      {icon} {label}
    </button>
  )
}

function MergeTab(): React.JSX.Element {
  const [files, setFiles] = useState<string[]>([])
  const [outPath, setOutPath] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async (): Promise<void> => {
    const paths = (await window.nexus.pdf.open()) as string[]
    setFiles((prev) => [...prev, ...paths])
  }

  const remove = (i: number): void => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const move = (i: number, dir: -1 | 1): void => {
    setFiles((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const run = async (): Promise<void> => {
    setError(null)
    setResult(null)
    if (files.length === 0 || !outPath) return
    setBusy(true)
    try {
      const res = await window.nexus.pdf.merge(files, outPath)
      setResult(res.path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={add}
          className="flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white"
        >
          <FilePlus className="h-3 w-3" /> Add PDFs
        </button>
        <div className="text-[11px] text-[var(--color-fg-muted)]">
          {files.length} selected · order matters
        </div>
      </div>
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        {files.length === 0 && (
          <div className="p-6 text-center text-[11px] text-[var(--color-fg-muted)]">
            No files selected.
          </div>
        )}
        {files.map((f, i) => (
          <div
            key={f + i}
            className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-[11px] last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 text-right font-mono text-[9px] text-[var(--color-fg-muted)]">
                {i + 1}
              </span>
              <FileText className="h-3 w-3 text-[var(--color-fg-muted)]" />
              <span className="truncate">{f}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-[var(--color-fg-muted)] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === files.length - 1}
                className="text-[var(--color-fg-muted)] disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => remove(i)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={outPath}
          onChange={(e) => setOutPath(e.target.value)}
          placeholder="/absolute/path/to/merged.pdf"
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px] outline-none"
        />
        <button
          onClick={run}
          disabled={busy || files.length === 0 || !outPath}
          className="flex items-center gap-1 rounded bg-[var(--color-pos)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> {busy ? 'Merging…' : 'Merge & save'}
        </button>
      </div>
      {result && (
        <div className="rounded bg-[var(--color-pos)]/10 p-2 text-[11px] text-[var(--color-pos)]">
          Saved: <span className="font-mono">{result}</span>
        </div>
      )}
      {error && (
        <div className="rounded bg-[var(--color-neg)]/10 p-2 text-[11px] text-[var(--color-neg)]">
          {error}
        </div>
      )}
    </div>
  )
}

interface Range {
  name: string
  from: number
  to: number
}

function SplitTab(): React.JSX.Element {
  const [path, setPath] = useState('')
  const [outDir, setOutDir] = useState('')
  const [ranges, setRanges] = useState<Range[]>([{ name: 'part1', from: 1, to: 1 }])
  const [files, setFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (): Promise<void> => {
    const paths = (await window.nexus.pdf.open()) as string[]
    if (paths[0]) setPath(paths[0])
  }

  const updateRange = (i: number, patch: Partial<Range>): void => {
    setRanges((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const run = async (): Promise<void> => {
    setError(null)
    setFiles([])
    if (!path || !outDir || ranges.length === 0) return
    setBusy(true)
    try {
      const res = await window.nexus.pdf.split(path, outDir, ranges)
      setFiles(res.files)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Split failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={pick}
          className="flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white"
        >
          <FilePlus className="h-3 w-3" /> Pick PDF
        </button>
        <span className="truncate font-mono text-[11px] text-[var(--color-fg-muted)]">
          {path || 'none'}
        </span>
      </div>
      <input
        value={outDir}
        onChange={(e) => setOutDir(e.target.value)}
        placeholder="/absolute/output/dir/"
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 font-mono text-[11px] outline-none"
      />
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <span>Ranges</span>
          <button
            onClick={() => setRanges((r) => [...r, { name: `part${r.length + 1}`, from: 1, to: 1 }])}
            className="text-[var(--color-info)] hover:underline"
          >
            + Add
          </button>
        </div>
        {ranges.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2 last:border-0"
          >
            <input
              value={r.name}
              onChange={(e) => updateRange(i, { name: e.target.value })}
              className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px]"
            />
            <span className="text-[10px] text-[var(--color-fg-muted)]">pages</span>
            <input
              type="number"
              value={r.from}
              onChange={(e) => updateRange(i, { from: Number(e.target.value) })}
              min={1}
              className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
            />
            <span className="text-[10px] text-[var(--color-fg-muted)]">to</span>
            <input
              type="number"
              value={r.to}
              onChange={(e) => updateRange(i, { to: Number(e.target.value) })}
              min={1}
              className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[11px]"
            />
            <button
              onClick={() => setRanges((rs) => rs.filter((_, idx) => idx !== i))}
              className="ml-auto text-[var(--color-fg-muted)] hover:text-[var(--color-neg)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={run}
        disabled={busy || !path || !outDir}
        className="flex items-center gap-1 rounded bg-[var(--color-pos)] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
      >
        <Scissors className="h-3 w-3" /> {busy ? 'Splitting…' : 'Split'}
      </button>
      {files.length > 0 && (
        <div className="rounded bg-[var(--color-pos)]/10 p-2 text-[11px]">
          <div className="mb-1 font-semibold text-[var(--color-pos)]">Saved {files.length} files:</div>
          {files.map((f) => (
            <div key={f} className="truncate font-mono text-[10px]">
              {f}
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="rounded bg-[var(--color-neg)]/10 p-2 text-[11px] text-[var(--color-neg)]">
          {error}
        </div>
      )}
    </div>
  )
}

function InfoTab(): React.JSX.Element {
  const [path, setPath] = useState('')
  const [info, setInfo] = useState<{ pages: number; title: string | null; author: string | null } | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  const pick = async (): Promise<void> => {
    const paths = (await window.nexus.pdf.open()) as string[]
    if (!paths[0]) return
    setPath(paths[0])
    setError(null)
    try {
      const data = await window.nexus.pdf.info(paths[0])
      setInfo(data as { pages: number; title: string | null; author: string | null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Info failed')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <button
        onClick={pick}
        className="flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1.5 text-[11px] font-medium text-white"
      >
        <FileText className="h-3 w-3" /> Pick PDF
      </button>
      {path && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px]">
          <div className="font-mono text-[10px] text-[var(--color-fg-muted)]">{path}</div>
          {info && (
            <div className="mt-2 space-y-1">
              <div>
                <span className="text-[var(--color-fg-muted)]">Pages:</span>{' '}
                <span className="font-mono tabular">{info.pages}</span>
              </div>
              <div>
                <span className="text-[var(--color-fg-muted)]">Title:</span> {info.title ?? '—'}
              </div>
              <div>
                <span className="text-[var(--color-fg-muted)]">Author:</span> {info.author ?? '—'}
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="rounded bg-[var(--color-neg)]/10 p-2 text-[11px] text-[var(--color-neg)]">
          {error}
        </div>
      )}
    </div>
  )
}
