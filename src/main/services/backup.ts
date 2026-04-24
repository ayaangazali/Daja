import { app } from 'electron'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  statSync,
  readdirSync
} from 'fs'
import { randomUUID } from 'crypto'
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
// Resource caps — reject pathological manifests before they exhaust memory.
const MAX_FILES_IN_MANIFEST = 20
const MAX_PER_FILE_BYTES = 100 * 1024 * 1024 // 100 MB per file
const MAX_TOTAL_BYTES = 200 * 1024 * 1024 // 200 MB aggregate

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
  const fileEntries = Object.entries(manifest.files)
  if (fileEntries.length > MAX_FILES_IN_MANIFEST) {
    throw new Error(
      `Backup manifest has ${fileEntries.length} files — more than the ${MAX_FILES_IN_MANIFEST} expected. Refusing to process.`
    )
  }
  let totalBytes = 0
  for (const [, entry] of fileEntries) {
    const b64len = entry?.b64?.length ?? 0
    // base64 decoded size ≈ b64len * 0.75. Cap before decoding.
    const approxBytes = Math.floor(b64len * 0.75)
    if (approxBytes > MAX_PER_FILE_BYTES) {
      throw new Error(
        `Backup file too large (${Math.round(approxBytes / 1024 / 1024)} MB > ${MAX_PER_FILE_BYTES / 1024 / 1024} MB limit)`
      )
    }
    totalBytes += approxBytes
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(
      `Backup total size ${Math.round(totalBytes / 1024 / 1024)} MB exceeds ${MAX_TOTAL_BYTES / 1024 / 1024} MB aggregate limit`
    )
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
    // UUID-suffixed staging filename avoids any pid/time collision risk
    const staging = `${target}.restoring-${randomUUID()}`

    // Backup existing if present
    if (existsSync(target)) {
      const preBackup = `${target}.pre-restore-${stamp}`
      copyFileSync(target, preBackup)
      backedUp.push(preBackup)
    }

    // Write to staging + atomic rename
    const bytes = Buffer.from(entry.b64, 'base64')
    writeFileSync(staging, bytes)
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
