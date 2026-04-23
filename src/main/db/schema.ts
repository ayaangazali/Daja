export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK(asset_class IN ('stock','crypto','forex','options','commodity','bond','etf')),
    side TEXT NOT NULL CHECK(side IN ('buy','sell','short','cover')),
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fees REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    exchange TEXT,
    date TEXT NOT NULL,
    notes TEXT,
    strategy_id INTEGER,
    journal_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);

CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER,
    ticker TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('entry','exit','update','note')),
    thesis TEXT,
    conviction INTEGER,
    target_price REAL,
    stop_loss REAL,
    risk_reward_ratio REAL,
    lessons TEXT,
    emotions TEXT,
    tags TEXT,
    screenshots TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_journal_ticker ON journal_entries(ticker);

CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'stock',
    list_name TEXT DEFAULT 'default',
    notes TEXT,
    target_buy_price REAL,
    alert_above REAL,
    alert_below REAL,
    sort_order INTEGER DEFAULT 0,
    added_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_ticker_list ON watchlist(ticker, list_name);

CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    rules TEXT NOT NULL,
    natural_language TEXT,
    asset_classes TEXT DEFAULT '["stock"]',
    is_active INTEGER DEFAULT 1,
    backtest_results TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    symptoms TEXT,
    severity INTEGER,
    temperature REAL,
    temperature_unit TEXT DEFAULT 'F',
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    weight REAL,
    weight_unit TEXT DEFAULT 'lbs',
    sleep_hours REAL,
    sleep_quality INTEGER,
    mood INTEGER,
    energy INTEGER,
    water_intake_oz REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    purpose TEXT,
    start_date TEXT,
    end_date TEXT,
    side_effects TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paper_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    side TEXT NOT NULL CHECK(side IN ('buy','sell')),
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fees REAL DEFAULT 0,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_paper_ticker ON paper_trades(ticker);

CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    name TEXT NOT NULL,
    layout_config TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_layout_module_name ON dashboard_layouts(module, name);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT,
    title TEXT,
    messages TEXT NOT NULL,
    context_ticker TEXT,
    summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_conv_module ON ai_conversations(module);
CREATE INDEX IF NOT EXISTS idx_ai_conv_ticker ON ai_conversations(context_ticker);

CREATE TABLE IF NOT EXISTS user_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_type TEXT NOT NULL,
    content TEXT NOT NULL,
    module TEXT DEFAULT 'finance',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Referential-integrity triggers. SQLite doesn't let us add FOREIGN KEY to
-- existing tables without recreating them, so we emulate ON DELETE SET NULL
-- via triggers on the parent-row delete. This keeps journal entries around
-- (users may want the note) but breaks the dangling reference.
CREATE TRIGGER IF NOT EXISTS trg_trade_delete_null_journal
AFTER DELETE ON trades
BEGIN
  UPDATE journal_entries SET trade_id = NULL WHERE trade_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_strategy_delete_null_trades
AFTER DELETE ON strategies
BEGIN
  UPDATE trades SET strategy_id = NULL WHERE strategy_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_journal_delete_null_trades
AFTER DELETE ON journal_entries
BEGIN
  UPDATE trades SET journal_id = NULL WHERE journal_id = OLD.id;
END;
`
