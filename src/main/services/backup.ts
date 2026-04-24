import { app } from 'electron'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync
} from 'fs'
import { join } from 'path'

/**
 * Daja data export / restore.
 *
 * Strategy: instead of zipping (native deps) we produce a single JSON manifest
 * that bundles the important userData files as base64 blobs. Small enough for
 * a desktop personal-finance app (typical total < 10 MB), easy to inspect.
 *
 * Files included:
 *   - daja.db  (SQLite database — trades, journal, watchlist, health, etc.)
 *   - daja-prefs.json  (AI provider prefs)
 *   - window-state.json  (window bounds)
 *
 * Explicitly EXCLUDED:
 *   - daja-vault.json  (encrypted API keys — machine-specific via safeStorage)
 *
 * Manifest structure:
 *   {
 *     schemaVersion: 1,
 *     createdAt: ISO date,
 *     platform: darwin|win32|linux,
 *     app: { name, version },
 *     files: { [filename]: { sizeBytes, b64 } }
 *   }
 */

const MANIFEST_SCHEMA_VERSION = 1

interface BackupManifest {
  schemaVersion: number
  createdAt: string
  platform: string
  app: { name: string; version: string }
  files: Record<string, { sizeBytes: number; b64: string }>
}

const BACKUP_FILES = ['daja.db', 'daja-prefs.json', 'window-state.json'] as const

export function exportBackup(): { manifestJson: string; filename: string } {
  const dir = app.getPath('userData')
  const files: BackupManifest['files'] = {}
  for (const name of BACKUP_FILES) {
    const p = join(dir, name)
    if (!existsSync(p)) continue
    const bytes = readFileSync(p)
    files[name] = { sizeBytes: bytes.length, b64: bytes.toString('base64') }
  }
  const manifest: BackupManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    platform: process.platform,
    app: { name: app.getName(), version: app.getVersion() },
    files
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return {
    manifestJson: JSON.stringify(manifest),
    filename: `daja-backup-${stamp}.json`
  }
}

/**
 * Restore a backup JSON. Validates manifest schema before touching disk.
 * Returns a summary of what was restored; caller should prompt app restart
 * to re-open the DB cleanly.
 *
 * Safety:
 *   - Rejects unknown schemaVersion (forward compatibility, not backward)
 *   - Writes to a staging directory first, then atomically renames in place
 *   - Creates a `.pre-restore-<timestamp>` backup of each existing file before
 *     overwrite so the user can roll back manually if the restore corrupts
 */
export function restoreBackup(manifestJson: string): {
  restored: string[]
  backedUp: string[]
  manifestDate: string
} {
  let manifest: BackupManifest
  try {
    manifest = JSON.parse(manifestJson) as BackupManifest
  } catch (err) {
    throw new Error(
      `Backup file is not valid JSON: ${err instanceof Error ? err.message : 'unknown error'}`
    )
  }
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Backup schemaVersion ${manifest.schemaVersion} is not supported by this build (expected ${MANIFEST_SCHEMA_VERSION}). Update Daja first.`
    )
  }
  if (!manifest.files || typeof manifest.files !== 'object') {
    throw new Error('Backup is missing a files manifest')
  }

  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const stamp = Date.now().toString()
  const backedUp: string[] = []
  const restored: string[] = []

  for (const [name, entry] of Object.entries(manifest.files)) {
    // Sanitize — only permit our known filenames, never an absolute or relative path
    if (!BACKUP_FILES.includes(name as (typeof BACKUP_FILES)[number])) continue
    const target = join(dir, name)
    const staging = `${target}.restoring.${stamp}`

    // Backup existing if present
    if (existsSync(target)) {
      const preBackup = `${target}.pre-restore-${stamp}`
      copyFileSync(target, preBackup)
      backedUp.push(preBackup)
    }

    // Write to staging + atomic rename
    const bytes = Buffer.from(entry.b64, 'base64')
    writeFileSync(staging, bytes)
    const { renameSync } = require('fs') as typeof import('fs')
    renameSync(staging, target)
    restored.push(name)
  }

  return { restored, backedUp, manifestDate: manifest.createdAt }
}

/**
 * List any pre-restore backup files currently on disk — lets user recover.
 */
export function listPreRestoreBackups(): { name: string; path: string; sizeBytes: number }[] {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.includes('.pre-restore-'))
    .map((f) => {
      const p = join(dir, f)
      return { name: f, path: p, sizeBytes: statSync(p).size }
    })
}
