/**
 * Shared microcopy + UX-writing constants.
 * Goal: consistent verb choice + tone across the app.
 * When you find yourself typing "Cancel" / "Delete" / "Loading..." — reference
 * this file first so we don't drift to 20 variants.
 */

export const BUTTON = {
  // Verb-first, short. Destructive verbs clearly destructive.
  save: 'Save',
  saveAnd: (what: string) => `Save ${what}`,
  update: 'Update',
  apply: 'Apply',
  cancel: 'Cancel',
  discard: 'Discard',
  keep: 'Keep',
  // Destructive — never soft-verb these. Say what you're doing.
  delete: 'Delete',
  deleteWith: (what: string) => `Delete ${what}`,
  remove: 'Remove',
  reset: 'Reset',
  clear: 'Clear',
  // CTAs
  getStarted: 'Get started',
  continue: 'Continue',
  retry: 'Retry',
  tryAgain: 'Try again',
  // Export
  export: 'Export',
  exportCsv: 'Export CSV',
  import: 'Import',
  downloadCsv: 'Download CSV'
}

export const LOADING = {
  generic: 'Loading…',
  fetchingQuotes: 'Fetching quotes…',
  fetchingFundamentals: 'Loading fundamentals…',
  generatingBriefing: 'Generating briefing…',
  computing: 'Computing…',
  saving: 'Saving…',
  deleting: 'Deleting…'
}

export const EMPTY = {
  noData: 'No data',
  noResults: 'No results',
  noMatches: 'No matches',
  // With actionable hints — prefer these over bare "No data"
  emptyWatchlist: {
    title: 'Watchlist is empty',
    hint: 'Add a ticker above, or paste a comma-separated list.'
  },
  emptyPositions: {
    title: 'No open positions',
    hint: 'Log a trade in the Tools tab to see metrics populate.'
  },
  emptyTrades: {
    title: 'No trades logged',
    hint: 'Import a CSV or use the trade form to add your first trade.'
  },
  emptyJournal: {
    title: 'No journal entries',
    hint: 'Write an entry to track trade thesis + lessons over time.'
  },
  offseasonSports: {
    title: 'Nothing scheduled',
    hint: 'This league is between seasons. Check back later.'
  }
}

/**
 * Classify an error for user-friendly display.
 * Use this instead of dumping raw err.message into the UI.
 */
export function friendlyError(err: unknown): {
  title: string
  detail: string
  action?: 'retry' | 'settings' | 'network'
} {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  if (!msg) return { title: 'Something went wrong', detail: 'Please try again.', action: 'retry' }
  if (/fetch failed|network|offline|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
    return {
      title: 'Network error',
      detail: 'Check your internet connection and try again.',
      action: 'network'
    }
  }
  if (/401|403|unauthoriz|forbidden/i.test(msg)) {
    return {
      title: 'Authentication failed',
      detail: 'Your API key may be invalid or expired. Check Settings > API Keys.',
      action: 'settings'
    }
  }
  if (/429|rate limit|too many/i.test(msg)) {
    return {
      title: 'Rate limit hit',
      detail: 'Your API provider is throttling. Wait a moment and retry.',
      action: 'retry'
    }
  }
  if (/500|502|503|server error/i.test(msg)) {
    return {
      title: 'Server error',
      detail: 'The provider is having issues. Retry in a minute.',
      action: 'retry'
    }
  }
  if (/context.{0,20}(overflow|too.{0,10}long|max.{0,10}tokens)/i.test(msg)) {
    return {
      title: 'Context too large',
      detail:
        'Your prompt + injected context exceeds the model window. Shorten the question or pick a bigger model.',
      action: 'settings'
    }
  }
  // Fallback
  return { title: 'Something went wrong', detail: msg.slice(0, 200), action: 'retry' }
}

/**
 * Tooltip definitions for common financial jargon. Use inline with
 * `<TooltipGlossary term="HHI" />` or lookup directly.
 */
export const GLOSSARY: Record<string, string> = {
  HHI: 'Herfindahl-Hirschman Index. Sum of squared portfolio weights. Values above 0.25 = highly concentrated; below 0.15 = diversified.',
  Beta: "A stock's sensitivity to the benchmark (SPY). Beta=1 moves with the market; 1.5 amplifies 50%; 0.5 dampens.",
  Sharpe:
    '(Annualized return − risk-free rate) / annualized volatility. Higher = better risk-adjusted return. >1 is healthy, >2 is great.',
  Sortino:
    "Like Sharpe but only penalizes downside volatility. Often a fairer measure for asymmetric strategies.",
  MaxDrawdown:
    'Largest peak-to-trough decline. A -40% drawdown means equity fell 40% from its high before recovering.',
  ATR: 'Average True Range. Average price range over N bars. Use for stop-loss sizing (e.g. stop = entry − 2× ATR).',
  RSI: 'Relative Strength Index. 0-100 momentum oscillator. >70 overbought, <30 oversold. Best on 14-period.',
  MACD: 'Moving Average Convergence Divergence. MACD = 12EMA − 26EMA. Signal line = 9-period EMA of MACD. Crossovers = trend change hints.',
  IV: 'Implied Volatility. What the options market expects future volatility to be. Higher IV = pricier options.',
  Delta: "Option's sensitivity to $1 of underlying move. 0.50 delta call gains ~$0.50 per $1 up-move.",
  Theta: "Option's daily time decay. Negative for long options — they lose value each day.",
  Vega: "Option's sensitivity to 1% change in IV. Long options have positive vega.",
  Gamma: 'Rate of change of delta. Highest near ATM. High gamma = fast delta changes = risky for short options.',
  'P/E': 'Price to Earnings ratio. Market cap / net income. <15 = cheap, >30 = rich (sector-dependent).',
  'PEG': 'P/E divided by EPS growth rate. Lynch\'s heuristic: PEG <1 = undervalued growth.',
  EPS: 'Earnings per share. Net income / shares outstanding.',
  'FCF': 'Free Cash Flow. Cash from ops minus capex. The true "owner earnings" number.',
  'ROE': 'Return on Equity. Net income / shareholder equity. > 15% sustained = durable franchise.',
  HHI_Effective_N:
    '1/HHI = effective number of equal-weighted positions. A 10-ticker book concentrated in 3 might have Effective N = 4.'
}
