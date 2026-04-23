/**
 * Named timing constants — eliminates magic numbers across the app.
 * All values in milliseconds unless suffixed _SEC.
 */

// Network + data staleness
export const QUOTE_STALE_MARKET_HOURS_MS = 60_000
export const QUOTE_STALE_EXTENDED_HOURS_MS = 5 * 60_000
export const QUOTE_STALE_CLOSED_MS = 30 * 60_000
export const HISTORICAL_STALE_MS = 5 * 60_000
export const FUNDAMENTALS_STALE_MS = 15 * 60_000
export const NEWS_STALE_MS = 10 * 60_000
export const SEARCH_STALE_MS = 30_000

// AI
export const AI_REQUEST_TIMEOUT_MS = 120_000
export const AI_BRIEFING_COOLDOWN_MS = 5 * 60_000
export const AI_MAX_RETRY_SEC = 60

// UI feedback
export const COPY_FEEDBACK_DURATION_MS = 1_500
export const SAVED_TOAST_DURATION_MS = 2_000
export const THROTTLE_MSG_DURATION_MS = 3_000

// Scroll + layout
export const SCROLL_AT_BOTTOM_THRESHOLD_PX = 100
export const LAYOUT_SAVE_DEBOUNCE_MS = 500

// Finance math
export const RISK_BETA_MIN_DAYS = 200 // ~8mo trading days — below this beta unreliable
export const SHARPE_TRADING_DAYS_PER_YEAR = 252
export const OPTIONS_MIN_SIGMA = 1e-4
