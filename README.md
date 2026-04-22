# Daja — Daja

> **Desktop-first AI super app.** Financial research workstation + portfolio tracking + AI assistant + sports, PDF, health. All local, all your keys, all yours.

Inspired by Bloomberg Terminal, Finviz, TradingView and Google Finance Beta. Built as a personal command center — not a generic dashboard.

## Stack

- **Electron 39** + React 19 + TypeScript (strict)
- **Vite 7** w/ lazy-loaded route modules
- **better-sqlite3** for local persistence (portfolio, journal, strategies, health, etc.)
- **safeStorage** (OS keychain) for API keys — never plaintext to disk
- **Tailwind v4** + shadcn/ui primitives
- **react-grid-layout** draggable dashboards · **lightweight-charts** interactive charts
- **cmdk** command palette · **Zustand** state · **@tanstack/react-query** server state
- **Vitest** unit tests (307) · **@playwright/test** E2E

## Features

### Finance War Room (flagship)

- **Home** — Google-Finance-Beta-style overview: 5-region market index grid w/ sparklines (US, Europe, Asia, Crypto, Futures), SPDR sector heatmap, AI-generated market summary, earnings banner, draggable/resizable panels w/ persistence.
- **Stock Detail** (10 tabs, hotkeys 1–9) — lightweight-charts candlestick/area w/ 9 timeframes + volume, Finviz fundamentals grid, technicals gauge (8 MAs, RSI/MACD/Stoch/Williams/ATR, classic + Fibonacci pivots), full statements (income/balance/cashflow, annual + quarterly) via Yahoo fundamentals-timeseries, EPS est vs actual w/ surprise %, options chain near-ATM + IV + **Black-Scholes Greeks (Δ, Θ/day)** + P/C ratio, insider txns + 13F holders + **90d insider signal (bullish/bearish/mixed)**, news + SEC EDGAR 10-K/Q/8-K/Form 4 + AI digest, Reddit sentiment + Grok X scan, Monte Carlo + SMA crossover backtest. Break-even + P&L scenario calculator on Overview.
- **Analyst tab** (annual/quarterly toggle w/ TTM FCF) — DCF intrinsic value + margin of safety, **Piotroski F-score** (9-point financial strength breakdown), **Altman Z-score** (bankruptcy zone), **ROIC** (NOPAT / invested capital), Graham Number, FCF Yield, FCF Conversion, Sustainable Growth, Magic Formula Earnings Yield, Interest Coverage, 3y Revenue/Earnings CAGR.
- **Portfolio** — Avg-cost positions, equity curve vs SPY, risk dashboard (portfolio β, Sharpe, max drawdown, correlation matrix, concentration), **tax lots (FIFO/LIFO/HIFO toggle)** w/ ST/LT gain split, dividend tracker (rate, yield, YoC, annual income, payment sparkline), allocation bar, trade log + CSV export, watchlist bulk import.
- **Strategy Builder** — Natural-language → AI-parse → JSON rules. 6 templates (Buffett value, Lynch GARP, Dividend income, High-growth tech, Short-squeeze, Deep value). Every stock scored against your rules.
- **Journal** — Log entries w/ conviction (1–10), target/stop, tags, emotions. AI analyzer finds patterns across last 30 entries.
- **Compare** — Split-screen A vs B w/ winner-highlighted table across 11 fundamentals.
- **Screener** — 8 Yahoo preset screens w/ AI score-all button.
- **Daily briefing** — AI one-minute audio-ready summary w/ browser Speech Synthesis.
- **Paper trading** — $100k starting cash, orders fill at live price.
- **Position Size Calculator** — Fixed-fractional risk model (1% account = N shares given stop distance) w/ R:R + warnings.
- **Watchlist** — Drag-reorder, hover-preview card (sparkline + day/52w/vol/mcap), price flash animations, per-ticker alerts w/ ±5%/±10% quick picks.

### Sibling modules

- **Sports Hub** — 12 leagues via ESPN API (NFL/NBA/MLB/NHL/CFB/CBB/MLS/EPL/La Liga/WNBA/F1/UFC), live scoreboard (60s refresh), standings, YouTube embed.
- **PDF Toolkit** — Merge (reorderable), split (named ranges), info via pdf-lib + native dialogs.
- **Health Tracker** — Symptom logger, vitals, meds, 5-chart timeline, AI health advisor.
- **AI Assistant** — Chat w/ per-module provider preferences, conversation history, meeting notes (Web Speech API transcription + AI summarize).

### Cross-cutting

- **5 AI providers** — Anthropic / OpenAI / Gemini / xAI Grok / Perplexity — streaming via unified `AIProvider` interface. Context injector embeds strategies + portfolio + journal in every prompt.
- **Settings** — Encrypted API key vault (9 providers), model per provider, module → provider mapping, theme.
- **Command palette** (⌘K) — Type a ticker → "Open stock detail" + "Add to watchlist". Tools: theme flip, focus mode, always-on-top, reload, export CSV, daily briefing.
- **Keyboard nav** — `j/k` through watchlist · `g`-chords (`gf` home, `gp` portfolio, `gr` strategies, `gj` journal, `gc` compare, `gn` screener, `gb` briefing, `gs` settings, `ga` assistant, `gh` health, `go` sports, `gd` PDF) · `1`–`9` detail tabs · `?` cheatsheet.
- **Status bar** — Market status (open/pre/post/closed NY time), online/offline, IPC ping ms, configured key counts, active provider, clock.
- **Focus mode** — Hide topbar + rail + status bar.
- **Always-on-top** via Electron IPC.

## Run

```bash
pnpm install
pnpm dev          # Electron + Vite HMR
pnpm build        # production bundle
pnpm test         # Vitest — 307 unit tests
pnpm e2e          # Playwright — smoke + extended
```

First run: open Settings (⚙) → add at least one AI provider key. Yahoo data needs no key.

## Privacy

- Everything local. No telemetry. No accounts.
- API keys encrypted via OS keychain (`safeStorage`) — never in repo, never in plaintext disk.
- SQLite at `app.getPath('userData')/daja.db`.
- Context isolation enabled, Node integration disabled, all IPC typed + zod-validated.

## Architecture

```
src/main/           Electron main — DB, keyvault, AI router, IPC
src/preload/        Typed bridge (window.daja.*)
src/shared/         IPC channel constants + zod schemas
src/renderer/       React app (lazy-loaded modules)
  shell/            Topbar, rail, cmdk, status bar, cheatsheet
  modules/          finance (home/detail/portfolio/strategy/journal/compare/screener/briefing/paper/risk)
                    sports, pdf-tools, health, assistant, settings
  hooks/            react-query wrappers over IPC
  lib/              pure utils (format, csv, indicators, priceAlerts, marketHours, sparklinePath, colorScale)
  shared/           ErrorBoundary, FlashPrice, PercentBadge, Sparkline
```

## License

Personal use.

Repo: [ayaangazali/Daja](https://github.com/ayaangazali/Daja)
