// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let TMP = ''

vi.mock('electron', () => ({
  app: {
    getPath: () => TMP,
    getName: () => 'Daja',
    getVersion: () => '0.0.0-test'
  }
}))

import { exportBackup, restoreBackup, listPreRestoreBackups } from './backup'

describe('backup export/restore round-trip', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'daja-backup-'))
  })
  afterEach(() => {
    try {
      rmSync(TMP, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  })

  it('exportBackup produces JSON with expected manifest shape', () => {
    writeFileSync(join(TMP, 'daja-prefs.json'), JSON.stringify({ theme: 'dark' }))
    const { manifestJson, filename } = exportBackup()
    const m = JSON.parse(manifestJson)
    expect(m.schemaVersion).toBe(1)
    expect(m.app.name).toBe('Daja')
    expect(typeof m.createdAt).toBe('string')
    expect(m.files['daja-prefs.json']).toBeDefined()
    expect(filename).toMatch(/daja-backup-\d{8}\.json/)
  })

  it('skips files that do not exist', () => {
    // No files written, just export
    const { manifestJson } = exportBackup()
    const m = JSON.parse(manifestJson)
    expect(Object.keys(m.files)).toHaveLength(0)
  })

  it('restoreBackup round-trips a prefs file', () => {
    const payload = { theme: 'light', aiByModule: { finance: 'anthropic' } }
    writeFileSync(join(TMP, 'daja-prefs.json'), JSON.stringify(payload))
    const { manifestJson } = exportBackup()

    // Wipe + restore into fresh tmp
    rmSync(TMP, { recursive: true, force: true })
    TMP = mkdtempSync(join(tmpdir(), 'daja-backup-r-'))

    const r = restoreBackup(manifestJson)
    expect(r.restored).toContain('daja-prefs.json')
    const restored = JSON.parse(readFileSync(join(TMP, 'daja-prefs.json'), 'utf8'))
    expect(restored).toEqual(payload)
  })

  it('rejects invalid JSON', () => {
    expect(() => restoreBackup('not json')).toThrow(/not valid JSON/)
  })

  it('rejects schemaVersion mismatch', () => {
    const fake = JSON.stringify({ schemaVersion: 999, files: {} })
    expect(() => restoreBackup(fake)).toThrow(/schemaVersion 999/)
  })

  it('creates pre-restore backup when overwriting an existing file', () => {
    writeFileSync(join(TMP, 'daja-prefs.json'), 'OLD')
    const { manifestJson } = exportBackup()

    // Now simulate a different content being restored
    const m = JSON.parse(manifestJson)
    m.files['daja-prefs.json'].b64 = Buffer.from('NEW').toString('base64')
    const r = restoreBackup(JSON.stringify(m))
    expect(r.backedUp.length).toBe(1)
    expect(r.backedUp[0]).toContain('.pre-restore-')

    // Live file is NEW
    expect(readFileSync(join(TMP, 'daja-prefs.json'), 'utf8')).toBe('NEW')
    // Pre-restore backup still holds OLD
    const preBackup = readFileSync(r.backedUp[0], 'utf8')
    expect(preBackup).toBe('OLD')
  })

  it('listPreRestoreBackups finds the backups', () => {
    writeFileSync(join(TMP, 'daja-prefs.json'), 'A')
    const { manifestJson } = exportBackup()
    const m = JSON.parse(manifestJson)
    m.files['daja-prefs.json'].b64 = Buffer.from('B').toString('base64')
    restoreBackup(JSON.stringify(m))
    const list = listPreRestoreBackups()
    expect(list.length).toBe(1)
    expect(existsSync(list[0].path)).toBe(true)
  })

  it('ignores unknown filenames in manifest (path traversal defense)', () => {
    const fake = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      platform: 'linux',
      app: { name: 'Daja', version: '0.0.0' },
      files: {
        '../../etc/passwd': { sizeBytes: 4, b64: Buffer.from('evil').toString('base64') },
        'unknown-file.json': { sizeBytes: 4, b64: Buffer.from('evil').toString('base64') }
      }
    }
    const r = restoreBackup(JSON.stringify(fake))
    expect(r.restored).toHaveLength(0)
    expect(existsSync(join(TMP, '..', '..', 'etc', 'passwd'))).toBe(false)
  })
})
