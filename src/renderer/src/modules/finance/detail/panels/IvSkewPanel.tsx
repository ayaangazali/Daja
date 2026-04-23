import { useMemo } from 'react'
import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useOptions } from '../../../../hooks/useStatements'
import { analyzeSkew } from '../../../../lib/ivSkew'
import { cn } from '../../../../lib/cn'

export function IvSkewPanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data } = useOptions(ticker)

  const result = useMemo(() => {
    if (!data) return null
    return analyzeSkew(data.calls, data.puts, data.underlyingPrice)
  }, [data])

  if (!result) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading IV skew…
      </div>
    )
  }

  const bothWings = result.rows.filter((r) => r.callIv != null || r.putIv != null)
  const minMoney = Math.min(...bothWings.map((r) => r.moneyness), -0.01)
  const maxMoney = Math.max(...bothWings.map((r) => r.moneyness), 0.01)
  const allIvs = bothWings.flatMap((r) => [r.callIv, r.putIv].filter((x): x is number => x != null))
  const minIv = Math.min(...allIvs, 0)
  const maxIv = Math.max(...allIvs, 0.1)

  const W = 600
  const H = 180
  const PAD = 30
  const toX = (money: number): number =>
    PAD + ((money - minMoney) / (maxMoney - minMoney || 1)) * (W - 2 * PAD)
  const toY = (iv: number): number =>
    H - PAD - ((iv - minIv) / (maxIv - minIv || 1)) * (H - 2 * PAD)

  const putPoints = bothWings.filter((r) => r.putIv != null)
  const callPoints = bothWings.filter((r) => r.callIv != null)

  const putPath = putPoints
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(r.moneyness).toFixed(1)},${toY(r.putIv as number).toFixed(1)}`)
    .join(' ')
  const callPath = callPoints
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${toX(r.moneyness).toFixed(1)},${toY(r.callIv as number).toFixed(1)}`)
    .join(' ')

  const regimeIcon =
    result.regime === 'put-smirk' ? (
      <TrendingDown className="h-3 w-3" />
    ) : result.regime === 'call-smirk' ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    )
  const regimeTone =
    result.regime === 'put-smirk'
      ? 'text-[var(--color-neg)]'
      : result.regime === 'call-smirk'
        ? 'text-[var(--color-pos)]'
        : 'text-[var(--color-fg-muted)]'

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Activity className="h-3 w-3" /> Implied volatility skew
        </div>
        <span className={cn('flex items-center gap-1 text-[10px] font-semibold', regimeTone)}>
          {regimeIcon}
          {result.regime.replace('-', ' ')}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="ATM IV"
          value={result.atmIv != null ? `${(result.atmIv * 100).toFixed(1)}%` : '—'}
        />
        <Stat
          label="Put skew (25Δ)"
          value={
            result.putSkew25Delta != null
              ? `${result.putSkew25Delta >= 0 ? '+' : ''}${result.putSkew25Delta.toFixed(1)}v`
              : '—'
          }
          tone={result.putSkew25Delta != null && result.putSkew25Delta > 3 ? 'neg' : undefined}
        />
        <Stat
          label="Call skew (25Δ)"
          value={
            result.callSkew25Delta != null
              ? `${result.callSkew25Delta >= 0 ? '+' : ''}${result.callSkew25Delta.toFixed(1)}v`
              : '—'
          }
          tone={result.callSkew25Delta != null && result.callSkew25Delta > 3 ? 'pos' : undefined}
        />
        <Stat
          label="Slope"
          value={result.skewSlope != null ? result.skewSlope.toFixed(2) : '—'}
        />
      </div>

      <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full">
          <line
            x1={toX(0)}
            x2={toX(0)}
            y1={PAD}
            y2={H - PAD}
            stroke="var(--color-fg-muted)"
            strokeDasharray="2,2"
            strokeOpacity="0.4"
          />
          <line
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD}
            y2={H - PAD}
            stroke="var(--color-border)"
          />
          {putPath && (
            <path d={putPath} fill="none" stroke="var(--color-neg)" strokeWidth="1.5" />
          )}
          {callPath && (
            <path d={callPath} fill="none" stroke="var(--color-pos)" strokeWidth="1.5" />
          )}
          {putPoints.map((r) => (
            <circle
              key={`p-${r.strike}`}
              cx={toX(r.moneyness)}
              cy={toY(r.putIv as number)}
              r="2"
              fill="var(--color-neg)"
            />
          ))}
          {callPoints.map((r) => (
            <circle
              key={`c-${r.strike}`}
              cx={toX(r.moneyness)}
              cy={toY(r.callIv as number)}
              r="2"
              fill="var(--color-pos)"
            />
          ))}
          <text
            x={toX(0)}
            y={H - 10}
            fontSize="9"
            fill="var(--color-fg-muted)"
            textAnchor="middle"
          >
            ATM
          </text>
          <text x={PAD} y={H - 10} fontSize="9" fill="var(--color-fg-muted)">
            {(minMoney * 100).toFixed(0)}%
          </text>
          <text
            x={W - PAD}
            y={H - 10}
            fontSize="9"
            fill="var(--color-fg-muted)"
            textAnchor="end"
          >
            +{(maxMoney * 100).toFixed(0)}%
          </text>
        </svg>
        <div className="mt-2 flex items-center justify-center gap-4 text-[9px] text-[var(--color-fg-muted)]">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-[var(--color-neg)]" /> Puts
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-[var(--color-pos)]" /> Calls
          </span>
        </div>
      </div>

      <div className="text-[10px] text-[var(--color-fg-muted)]">{result.rationale}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg'
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="text-[9px] uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div
        className={cn(
          'font-mono text-[14px] font-semibold tabular',
          tone === 'pos' && 'text-[var(--color-pos)]',
          tone === 'neg' && 'text-[var(--color-neg)]'
        )}
      >
        {value}
      </div>
    </div>
  )
}
