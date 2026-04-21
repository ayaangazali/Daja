import { strategiesRepo } from '../db/repos/strategies'
import { tradesRepo } from '../db/repos/trades'
import { watchlistRepo } from '../db/repos/watchlist'
import { userContextRepo } from '../db/repos/userContext'
import { journalRepo } from '../db/repos/journal'

export interface ContextOptions {
  module: string
  ticker?: string
  limit?: number
}

export function buildUserContextBlock(opts: ContextOptions): string {
  const parts: string[] = []
  try {
    const ctx = userContextRepo.list(opts.module)
    if (ctx.length > 0) {
      parts.push('<user_profile>')
      for (const c of ctx.slice(0, 10)) {
        parts.push(`[${c.context_type}] ${c.content}`)
      }
      parts.push('</user_profile>')
    }
  } catch {
    // ignore
  }

  if (opts.module === 'finance') {
    try {
      const strategies = strategiesRepo.listActive()
      if (strategies.length > 0) {
        parts.push('<strategies>')
        for (const s of strategies.slice(0, 10)) {
          parts.push(
            `- ${s.name}: ${s.natural_language ?? s.description ?? 'rules: ' + JSON.stringify(s.rules)}`
          )
        }
        parts.push('</strategies>')
      }
    } catch {
      // ignore
    }

    try {
      const watchlist = watchlistRepo.list('default')
      if (watchlist.length > 0) {
        parts.push(`<watchlist>${watchlist.map((w) => w.ticker).join(', ')}</watchlist>`)
      }
    } catch {
      // ignore
    }

    try {
      const trades = tradesRepo.list().slice(0, 25)
      if (trades.length > 0) {
        parts.push('<recent_trades>')
        for (const t of trades) {
          parts.push(
            `${t.date} ${t.side.toUpperCase()} ${t.quantity} ${t.ticker} @ $${t.price} (fees $${t.fees})`
          )
        }
        parts.push('</recent_trades>')
      }
    } catch {
      // ignore
    }

    if (opts.ticker) {
      try {
        const journal = journalRepo.byTicker(opts.ticker).slice(0, 5)
        if (journal.length > 0) {
          parts.push(`<journal_for_${opts.ticker}>`)
          for (const j of journal) {
            parts.push(
              `[${j.entry_type}] conviction=${j.conviction ?? '?'} thesis=${(j.thesis ?? '').slice(0, 200)}`
            )
          }
          parts.push(`</journal_for_${opts.ticker}>`)
        }
      } catch {
        // ignore
      }
    }
  }

  return parts.join('\n')
}
