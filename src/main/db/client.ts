import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

export function openDatabase(): Database.Database {
  if (db) return db
  const dir = app.getPath('userData')
  const path = join(dir, 'daja.db')
  db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  return db
}

export function getDb(): Database.Database {
  if (!db) return openDatabase()
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
