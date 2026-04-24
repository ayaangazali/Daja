/**
 * Journal → trade outcome linkage.
 *
 * Given a journal entry referencing a ticker + thesis at time T, compute the
 * outcome: what did the position do in the N trading days after the entry?
 * Surfaces: "was the thesis right?" at a glance.
 *
 * Two shapes of evaluation:
 *   - entry-type: next close vs target_price + stop_loss touch detection
 *   - exit-type: realized pnl if the trade was closed
 */

import type { HistoricalBar } from '../hooks/useFinance'

export interface JournalLike {
  id: number
  ticker: string
  entry_type: 'entry' | 'exit' | 'update' | 'note'
  thesis: string | null
  target_price: number | null
  stop_loss: number | null
  conviction: number | null
  created_at: string
}

export interface JournalOutcome {
  /** % return from entry bar to last available bar (or min(N, last)) */
  returnPct: number | null
  /** Bar count actually evaluated */
  barsEvaluated: number
  /** Did target price get hit during window (high >= target)? */
  targetHit: boolean
  /** Did stop-loss get touched during window (low <= stop)? */
  stopHit: boolean
  /** Verdict heuristic */
  verdict: 'win' | 'loss' | 'pending' | 'n/a'
  /** Short rationale string */
  rationale: string
}

const MS_DAY = 86_400_000

export function outcomeForEntry(
  entry: JournalLike,
  bars: HistoricalBar[],
  opts: { evalDays?: number; today?: Date } = {}
): JournalOutcome {
  const evalDays = opts.evalDays ?? 30
  const today = opts.today ?? new Date()
  const createdTime = new Date(entry.created_at).getTime()
  if (Number.isNaN(createdTime)) {
    return {
      returnPct: null,
      barsEvaluated: 0,
      targetHit: false,
      stopHit: false,
      verdict: 'n/a',
      rationale: 'Entry date unparsable.'
    }
  }
  // Find bar closest to or just after created_at
  const createdSec = createdTime / 1000
  const startIdx = bars.findIndex((b) => b.time >= createdSec)
  if (startIdx < 0) {
    return {
      returnPct: null,
      barsEvaluated: 0,
      targetHit: false,
      stopHit: false,
      verdict: 'pending',
      rationale: 'No bars yet — entry is in the future or history not fetched.'
    }
  }
  const startClose = bars[startIdx].close
  if (startClose == null || !Number.isFinite(startClose) || startClose <= 0) {
    return {
      returnPct: null,
      barsEvaluated: 0,
      targetHit: false,
      stopHit: false,
      verdict: 'n/a',
      rationale: 'Start-bar close missing.'
    }
  }

  // Evaluate next N bars (or until end of data)
  const endIdx = Math.min(bars.length - 1, startIdx + evalDays)
  const window = bars.slice(startIdx, endIdx + 1)

  let targetHit = false
  let stopHit = false
  if (entry.target_price != null && Number.isFinite(entry.target_price)) {
    targetHit = window.some((b) => b.high != null && b.high >= entry.target_price!)
  }
  if (entry.stop_loss != null && Number.isFinite(entry.stop_loss)) {
    stopHit = window.some((b) => b.low != null && b.low <= entry.stop_loss!)
  }

  const lastClose = window[window.length - 1].close
  const returnPct =
    lastClose != null && startClose > 0 ? ((lastClose - startClose) / startClose) * 100 : null

  // Verdict heuristic — asymmetric: target hit without stop hit = clean win;
  // stop hit = loss; both hit = depends on order but we conservatively mark
  // loss since stops typically fire first in intraday sequence.
  let verdict: JournalOutcome['verdict'] = 'pending'
  let rationale = ''
  const daysSince = Math.floor((today.getTime() - createdTime) / MS_DAY)
  if (targetHit && !stopHit) {
    verdict = 'win'
    rationale = `Target hit within ${window.length}d. Return ${returnPct?.toFixed(1)}%.`
  } else if (stopHit) {
    verdict = 'loss'
    rationale = `Stop-loss touched within ${window.length}d. Return ${returnPct?.toFixed(1)}%.`
  } else if (window.length >= evalDays) {
    // Full window elapsed without either trigger — classify by return
    if (returnPct != null && returnPct >= 5) {
      verdict = 'win'
      rationale = `Up ${returnPct.toFixed(1)}% over ${window.length}d, neither target nor stop touched.`
    } else if (returnPct != null && returnPct <= -5) {
      verdict = 'loss'
      rationale = `Down ${returnPct.toFixed(1)}% over ${window.length}d.`
    } else {
      verdict = 'pending'
      rationale = `Flat-ish (${returnPct?.toFixed(1)}%) over ${window.length}d.`
    }
  } else {
    verdict = 'pending'
    rationale = `${daysSince}d since entry — still inside evaluation window of ${evalDays}d.`
  }

  return {
    returnPct,
    barsEvaluated: window.length,
    targetHit,
    stopHit,
    verdict,
    rationale
  }
}
