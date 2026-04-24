# Contributing to Daja

Daja is a desktop finance super-app built on Electron + React + TypeScript. This guide covers local setup, architecture boundaries, testing, and conventions.

## Quick start

```bash
git clone https://github.com/ayaangazali/Daja.git
cd Daja
pnpm install
pnpm dev
```

Node **22 LTS** is expected (matches the CI matrix). If you use `nvm`:
```bash
nvm install 22
nvm use 22
```

## Architecture

Three process boundaries — respect them:

- **`src/main/`** — Electron main process. Node.js APIs (fs, better-sqlite3, Yahoo Finance fetch, PDF ops, keychain). No DOM.
- **`src/preload/`** — bridge. Exposes typed APIs to renderer via `contextBridge`. Sandbox-safe.
- **`src/renderer/`** — React app. No Node imports. All external calls go through `window.daja.*` (IPC) — enforced by CSP `connect-src 'self'`.
- **`src/shared/`** — types importable from both main and renderer. Keep this directory small and pure (no side-effects, no native deps).

### Data layer

- SQLite via `better-sqlite3`. Schema in `src/main/db/schema.ts`, migrations in `src/main/db/migrations.ts` (append-only, never renumber).
- Repos in `src/main/db/repos/*` expose typed CRUD; they're the only path the renderer reaches via `window.daja.db.call('repo', 'method', [args])`.
- JSON fallback store (`src/main/services/jsonStore.ts`) for preferences + window state — atomic write-then-rename.

### AI layer

- Providers in `src/main/ai/providers/` (anthropic, openaiCompat, gemini). All implement `AIProvider` with streaming async-generator.
- Prompts in `src/main/ai/prompts.ts` — grounding rules + refusal guardrails live here.
- `router.ts` holds `MODEL_PREFERENCES` with fallback chains.

## Running

```bash
pnpm dev            # start with hot reload
pnpm build          # production build
pnpm build:mac      # package .dmg (requires signing for distribution)
pnpm build:win      # package .exe
pnpm build:linux    # package AppImage
```

## Testing

```bash
pnpm test           # vitest watch mode
pnpm test:run       # single run
pnpm test:e2e       # Playwright E2E (requires built app)
```

Unit tests live next to their module as `<name>.test.ts`. Use `// @vitest-environment node` at the top of main-process tests to avoid jsdom wrapping Node built-ins.

## Conventions

### Adding a database schema change
1. Edit `src/main/db/schema.ts` (keeps `CREATE TABLE IF NOT EXISTS` for new tables only).
2. Append a new migration to `MIGRATIONS` in `src/main/db/migrations.ts`:
   ```ts
   { version: N+1, description: '...', up: (db) => db.exec('ALTER TABLE ...') }
   ```
3. Never renumber or remove historical migrations.

### Adding a new IPC endpoint
1. Add channel name to `src/shared/ipc.ts`.
2. Register handler in the matching `src/main/ipc/<module>Ipc.ts`. Validate input with Zod.
3. Expose typed method in `src/preload/index.ts`.
4. Import via `window.daja.*` in renderer.

### Adding a shared type
Put it in `src/shared/`. Both main + renderer can `import type` from it. No runtime code unless it's pure + cross-boundary safe.

### Microcopy + UX writing
Use the canonical constants in `src/renderer/src/lib/copy.ts`:
- `BUTTON.*` for button labels
- `LOADING.*` for loading states
- `EMPTY.*` for empty-state titles + hints
- `GLOSSARY` for financial term definitions (used by `<Tooltip term="..." />`)
- `friendlyError(err)` to classify raw errors into user-facing copy

### Accessibility
- Every icon-only button must have `aria-label`.
- Interactive elements should use native `<button>` / `<a>` — no `<div onClick>`.
- Focus-visible ring handled globally in `src/renderer/src/styles/globals.css`.
- Respect `prefers-reduced-motion` (also globally handled).

### Error boundaries
- Wrap each panel in `<PanelBoundary label="...">` from `src/renderer/src/shared/ErrorBoundary.tsx` so one panel's crash doesn't replace the entire tab.

## Branching + commits

- Work off `main`. Open a PR for anything non-trivial.
- One-line subject in active voice, past tense body (what changed + why).
- Tests in the same commit as the code change.
- Co-Authored-By trailers welcome.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting. Short version: never commit API keys, never log raw keys, always route external HTTP through main.

## Questions

Open an issue with the `question` label. For bugs, include platform + Node version + minimal repro.
