import { useMemo } from 'react'
import { TrendingDown, TrendingUp, Gauge } from 'lucide-react'
import { useHistorical } from '../../../../hooks/useFinance'
import { ema, sma, rsi } from '../../../../lib/indicators'
import { adx, bollinger, keltnerChannels, macd } from '../../../../lib/indicators2'
import { trendScore, ttmSqueeze } from '../../../../lib/trendScore'
import { cn } from '../../../../lib/cn'

export function TrendScorePanel({ ticker }: { ticker: string }): React.JSX.Element {
  const { data: bars = [] } = useHistorical(ticker, '1y')

  const analysis = useMemo(() => {
    const closes = bars.map((b) => b.close).filter((v): v is number => v != null)
    const highs = bars.map((b) => b.high ?? b.close ?? 0)
    const lows = bars.map((b) => b.low ?? b.close ?? 0)
    if (closes.length < 60) return null
    const price = closes[closes.length - 1]
    const sma20 = sma(closes, 20)
    const sma50 = sma(closes, 50)
    const sma200 = sma(closes, 200)
    const ema9 = ema(closes, 9)
    const ema21 = ema(closes, 21)
    const rsiVal = rsi(closes, 14)
    const m = macd(closes)
    const a = adx(highs, lows, closes, 14)

    const score = trendScore({
      price,
      sma20,
      sma50,
      sma200,
      ema9,
      ema21,
      rsi: rsiVal,
      macd: m?.macd ?? null,
      macdSignal: m?.signal ?? null,
      adx: a?.adx ?? null,
      plusDI: a?.plusDI ?? null,
      minusDI: a?.minusDI ?? null
    })

    const bb = bollinger(closes, 20, 2)
    const kc = keltnerChannels(highs, lows, closes, 20, 2)
    const kcUpper = kc.upper[kc.upper.length - 1]
    const kcLower = kc.lower[kc.lower.length - 1]
    let squeeze: 'squeeze_on' | 'squeeze_off' | null = null
    if (bb && kcUpper != null && kcLower != null) {
      squeeze = ttmSqueeze(bb.upper, bb.lower, kcUpper, kcLower)
    }

    return { score, squeeze }
  }, [bars])

  if (!analysis) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-[11px] text-[var(--color-fg-muted)]">
        Loading trend score…
      </div>
    )
  }

  const { score, squeeze } = analysis
  const toneClass =
    score.strength === 'strong_bull'
      ? 'bg-[var(--color-pos)]/20 text-[var(--color-pos)]'
      : score.strength === 'bull'
        ? 'bg-[var(--color-pos)]/10 text-[var(--color-pos)]'
        : score.strength === 'strong_bear'
          ? 'bg-[var(--color-neg)]/20 text-[var(--color-neg)]'
          : score.strength === 'bear'
            ? 'bg-[var(--color-neg)]/10 text-[var(--color-neg)]'
            : 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]'

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <Gauge className="h-3 w-3" /> Trend strength score
        </div>
        <div className="flex items-center gap-2">
          {score.score > 0 ? (
            <TrendingUp className="h-4 w-4 text-[var(--color-pos)]" />
          ) : score.score < 0 ? (
            <TrendingDown className="h-4 w-4 text-[var(--color-neg)]" />
          ) : null}
          <span
            className={cn('rounded px-2 py-0.5 font-mono text-[11px] uppercase', toneClass)}
          >
            {score.strength.replace('_', ' ')}
          </span>
          <span className="font-mono text-[14px] font-bold tabular">
            {score.score > 0 ? '+' : ''}
            {score.score}
          </span>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative mb-2 h-2 w-full overflow-hidden rounded bg-[var(--color-bg)]">
        <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--color-fg-muted)]" />
        <div
          className={cn(
            'absolute top-0 h-full',
            score.score > 0
              ? 'left-1/2 bg-[var(--color-pos)]'
              : 'bg-[var(--color-neg)]'
          )}
          style={{
            left: score.score > 0 ? '50%' : `${50 + score.score / 2}%`,
            width: `${Math.abs(score.score) / 2}%`
          }}
        />
      </div>

      {squeeze === 'squeeze_on' && (
        <div className="mb-2 rounded bg-[var(--color-warn)]/15 px-2 py-1 text-[10px] text-[var(--color-warn)]">
          ⚡ TTM Squeeze ON — Bollinger inside Keltner; volatility compressed, breakout pending.
        </div>
      )}

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        {score.components.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-[10px]"
          >
            <span className="text-[var(--color-fg-muted)]">{c.name}</span>
            <span
              className={cn(
                'tabular',
                c.points > 0
                  ? 'text-[var(--color-pos)]'
                  : c.points < 0
                    ? 'text-[var(--color-neg)]'
                    : 'text-[var(--color-fg-muted)]'
              )}
            >
              {c.points > 0 ? '+' : ''}
              {c.points} · {c.reason}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
