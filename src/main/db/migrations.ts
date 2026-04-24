import type Database from 'better-sqlite3'

/**
 * Schema migration framework.
 *
 * Model: each migration is a numbered function that transforms the schema
 * from version N-1 to N. We read/write the version via SQLite's built-in
 * `PRAGMA user_version` (stored in the db header, survives migrations).
 *
 * Rules:
 *   - Migrations MUST be idempotent against a partial-apply crash: wrap in
 *     a transaction; either the whole thing commits or nothing changes.
 *   - Never renumber or remove historical migrations — add new ones.
 *   - Each migration should be < 100 lines. Big schema changes = multiple
 *     small migrations.
 *   - Data backfills allowed via raw SQL (`db.exec`) or parameterized
 *     statements (`db.prepare(...).run(...)`).
 *
 * Current migrations:
 *   v0 → baseline (no migration ever run)
 *   v1 → reserved for first real schema change
 *
 * To add a migration: push a new entry with `version: N+1` and the up()
 * callback. The runner applies every missing version in order on startup.
 */

export interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
}

/**
 * Ordered list — index position IS NOT the version. `version` field is authoritative.
 * Historical migrations never mutate; append only.
 */
export const MIGRATIONS: Migration[] = [
  // Example seed migration. Currently no-op because SCHEMA_SQL already
  // creates all required tables on fresh install via CREATE TABLE IF NOT
  // EXISTS. Future schema changes become their own entries below.
  {
    version: 1,
    description: 'baseline — tables created by SCHEMA_SQL, triggers by schema.ts',
    up: (_db) => {
      // no-op
    }
  },
  {
    version: 2,
    description: 'data-integrity triggers on trades quantity/price + watchlist ticker format',
    up: (db) => {
      // SQLite doesn't let us add CHECK constraints to existing tables, but
      // BEFORE INSERT triggers enforce the same contract. Defensive against
      // pathological IPC payloads that escape Zod (e.g., negative qty, Infinity).
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_trades_quantity_positive
        BEFORE INSERT ON trades
        FOR EACH ROW
        WHEN NEW.quantity <= 0 OR NEW.quantity IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'trades.quantity must be > 0');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_trades_price_positive
        BEFORE INSERT ON trades
        FOR EACH ROW
        WHEN NEW.price <= 0 OR NEW.price IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'trades.price must be > 0');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_trades_fees_nonneg
        BEFORE INSERT ON trades
        FOR EACH ROW
        WHEN NEW.fees IS NOT NULL AND NEW.fees < 0
        BEGIN
          SELECT RAISE(ABORT, 'trades.fees must be >= 0');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_watchlist_ticker_nonempty
        BEFORE INSERT ON watchlist
        FOR EACH ROW
        WHEN NEW.ticker IS NULL OR length(trim(NEW.ticker)) = 0
        BEGIN
          SELECT RAISE(ABORT, 'watchlist.ticker must be non-empty');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_paper_trades_quantity_positive
        BEFORE INSERT ON paper_trades
        FOR EACH ROW
        WHEN NEW.quantity <= 0 OR NEW.quantity IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'paper_trades.quantity must be > 0');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_paper_trades_price_positive
        BEFORE INSERT ON paper_trades
        FOR EACH ROW
        WHEN NEW.price <= 0 OR NEW.price IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'paper_trades.price must be > 0');
        END;
      `)
    }
  }
]

/**
 * Run every migration whose version > current user_version, each inside its
 * own transaction. Throws if any migration fails — DB remains at prior
 * version so user isn't stuck in a half-migrated state.
 */
export function runMigrations(db: Database.Database): {
  applied: number[]
  fromVersion: number
  toVersion: number
} {
  const fromVersion = Number(db.pragma('user_version', { simple: true })) || 0
  const applied: number[] = []

  // Sort defensively in case MIGRATIONS is reordered
  const ordered = [...MIGRATIONS].sort((a, b) => a.version - b.version)

  for (const m of ordered) {
    if (m.version <= fromVersion) continue
    try {
      const tx = db.transaction(() => {
        m.up(db)
        // pragma cannot be bound, but we control the number so string-concat is safe
        db.pragma(`user_version = ${m.version}`)
      })
      tx()
      applied.push(m.version)
      console.log(`[db-migration] applied v${m.version}: ${m.description}`)
    } catch (err) {
      console.error(`[db-migration] failed at v${m.version}:`, err)
      throw new Error(
        `Database migration v${m.version} failed (${m.description}). Previous version (${fromVersion}) preserved. Error: ${err instanceof Error ? err.message : 'unknown'}`
      )
    }
  }

  const toVersion = Number(db.pragma('user_version', { simple: true })) || 0
  return { applied, fromVersion, toVersion }
}
