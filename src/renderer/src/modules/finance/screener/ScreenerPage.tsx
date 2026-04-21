import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp, Flame, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { fmtLargeNum, fmtPct, fmtPrice, signColor } from '../../../lib/format'
import { useAddToWatchlist } from '../../../hooks/useWatchlist'
import { useAI } from '../../../hooks/useAI'
import { cn } from '../../../lib/cn'

const PRESETS = [
  { id: 'day_gainers', label: 'Gainers', icon: TrendingUp },
  { id: 'day_losers', label: 'Losers', icon: TrendingDown },
  { id: 'most_actives', label: 'Most Active', icon: Flame },
  { id: 'undervalued_growth_stocks', label: 'Undervalued Growth', icon: TrendingUp },
  { id: 'growth_technology_stocks', label: 'Growth Tech', icon: TrendingUp },
  { id: 'aggressive_small_caps', label: 'Aggressive Small Caps', icon: Flame },
  { id: 'small_cap_gainers', label: 'Small Cap Gainers', icon: TrendingUp },
  { id: 'undervalued_large_caps', label: 'Undervalued Large Caps', icon: TrendingUp }
]

interface ScreenerStock {
  symbol: string
  shortName: string
  regularMarketPrice: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  marketCap: number | null
  trailingPE: number | null
  forwardPE: number | null
  epsTrailingTwelveMonths: number | null
  sector: string | null
  industry: string | null
}

export function ScreenerPage(): React.JSX.Element {
  const [preset, setPreset] = useState(PRESETS[0].id)
  const { data = [], isLoading, refetch, isRefetching } = useQuery<ScreenerStock[]>({
    queryKey: ['screener', preset],
    queryFn: () => window.nexus.finance.screener(preset, 30) as Promise<ScreenerStock[]>,
    staleTime: 60_000
  })
  const addWatch = useAddToWatchlist()
  const { state, start, cancel } = useAI()

  const analyzeAll = (): void => {
    if (data.length === 0) return
    const list = data
      .slice(0, 20)
      .map(
        (s) =>
          `- ${s.symbol} ${s.shortName}: $${s.regularMarketPrice.toFixed(2)} (${s.regularMarketChangePercent > 0 ? '+' : ''}${s.regularMarketChangePercent.toFixed(2)}%), P/E ${s.trailingPE?.toFixed(1) ?? '—'}, Fwd P/E ${s.forwardPE?.toFixed(1) ?? '—'}, mcap $${fmtLargeNum(s.marketCap)}, ${s.sector ?? ''}`
      )
      .join('\n')
    void start({
      module: 'finance',
      promptKey: 'finance',
      messages: [
        {
          role: 'user',
          content: `Here's a ${preset.replace(/_/g, ' ')} screener result. Score each against my active strategies and identify the top 5 I should watchlist + 1-line thesis each. Flag anything that looks like a trap.\n\n${list}`
        }
      ]
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-[11px]',
              preset === p.id
                ? 'bg-[var(--color-info)] text-white'
                : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]'
            )}
          >
            <p.icon className="h-3 w-3" /> {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)]"
          >
            <RefreshCw className={cn('h-3 w-3', isRefetching && 'animate-spin')} /> Refresh
          </button>
          <button
            onClick={state.streaming ? cancel : analyzeAll}
            disabled={data.length === 0}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-white',
              state.streaming ? 'bg-[var(--color-neg)]' : 'bg-[var(--color-info)]'
            )}
          >
            <Sparkles className="h-3 w-3" /> {state.streaming ? 'Stop' : 'AI Score All'}
          </button>
        </div>
      </div>
      {state.text && (
        <div className="border-b border-[var(--color-info)]/30 bg-[var(--color-info)]/5 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {state.text}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="p-4 text-[11px] text-[var(--color-fg-muted)]">Loading…</div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="p-6 text-center text-[11px] text-[var(--color-fg-muted)]">
            No results for this screener right now.
          </div>
        )}
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[10px] uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-2 py-1.5 text-left">Ticker</th>
              <th className="px-2 py-1.5 text-left">Name</th>
              <th className="px-2 py-1.5 text-right">Price</th>
              <th className="px-2 py-1.5 text-right">Chg %</th>
              <th className="px-2 py-1.5 text-right">Vol</th>
              <th className="px-2 py-1.5 text-right">Mkt Cap</th>
              <th className="px-2 py-1.5 text-right">P/E</th>
              <th className="px-2 py-1.5 text-right">Fwd P/E</th>
              <th className="px-2 py-1.5 text-left">Sector</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr
                key={s.symbol}
                className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]"
              >
                <td className="px-2 py-1 font-mono font-semibold">
                  <NavLink
                    to={`/finance/${s.symbol}`}
                    className="hover:text-[var(--color-info)]"
                  >
                    {s.symbol}
                  </NavLink>
                </td>
                <td className="max-w-[18rem] truncate px-2 py-1" title={s.shortName}>
                  {s.shortName}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  ${fmtPrice(s.regularMarketPrice)}
                </td>
                <td
                  className={cn(
                    'px-2 py-1 text-right font-mono tabular',
                    signColor(s.regularMarketChangePercent)
                  )}
                >
                  {fmtPct(s.regularMarketChangePercent)}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {fmtLargeNum(s.regularMarketVolume)}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  ${fmtLargeNum(s.marketCap)}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {s.trailingPE?.toFixed(1) ?? '—'}
                </td>
                <td className="px-2 py-1 text-right font-mono tabular">
                  {s.forwardPE?.toFixed(1) ?? '—'}
                </td>
                <td className="max-w-[10rem] truncate px-2 py-1 text-[10px] text-[var(--color-fg-muted)]">
                  {s.sector ?? '—'}
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    onClick={() => addWatch.mutate({ ticker: s.symbol })}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[9px] hover:bg-[var(--color-bg)]"
                  >
                    + Watchlist
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
