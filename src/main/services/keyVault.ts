import { safeStorage } from 'electron'
import type { KeyMeta, ProviderId } from '../../shared/ipc'
import { PROVIDER_IDS } from '../../shared/ipc'
import { createJsonStore } from './jsonStore'

interface VaultEntry {
  cipher: string // base64
  updatedAt: string
  lastTested?: string
  lastTestResult?: 'success' | 'error'
  lastTestMessage?: string
}

interface VaultSchema extends Record<string, unknown> {
  keys: Record<string, VaultEntry>
}

let _store: ReturnType<typeof createJsonStore<VaultSchema>> | null = null
function store(): ReturnType<typeof createJsonStore<VaultSchema>> {
  if (!_store) _store = createJsonStore<VaultSchema>('daja-vault', { keys: {} })
  return _store
}

function readAll(): Record<string, VaultEntry> {
  return store().get('keys') ?? {}
}

function writeAll(keys: Record<string, VaultEntry>): void {
  store().set('keys', keys)
}

/**
 * Returns true if OS keychain is available.
 * Called by UI layer (via isEncryptionAvailable IPC) so Settings can show
 * an actionable banner on systems without a backing store rather than
 * hard-failing only when the user first tries to save a key.
 */
export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function assertEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      process.platform === 'linux'
        ? 'Key encryption unavailable. Install libsecret or gnome-keyring (see `sudo apt install libsecret-1-0 gnome-keyring`) then restart Daja. See https://www.electronjs.org/docs/latest/api/safe-storage for details.'
        : 'Key encryption unavailable — no OS keychain. Reinstall Daja or check system permissions.'
    )
  }
}

export function listKeys(): KeyMeta[] {
  const all = readAll()
  return PROVIDER_IDS.map((provider) => {
    const entry = all[provider]
    return {
      provider,
      configured: !!entry?.cipher,
      updatedAt: entry?.updatedAt ?? null,
      lastTested: entry?.lastTested ?? null,
      lastTestResult: entry?.lastTestResult ?? null,
      lastTestMessage: entry?.lastTestMessage ?? null
    }
  })
}

export function setKey(provider: ProviderId, plaintext: string): void {
  assertEncryptionAvailable()
  const cipher = safeStorage.encryptString(plaintext).toString('base64')
  const all = readAll()
  all[provider] = { cipher, updatedAt: new Date().toISOString() }
  writeAll(all)
}

export function deleteKey(provider: ProviderId): void {
  const all = readAll()
  delete all[provider]
  writeAll(all)
}

export function getKeyPlaintext(provider: ProviderId): string | null {
  const all = readAll()
  const entry = all[provider]
  if (!entry?.cipher) return null
  assertEncryptionAvailable()
  return safeStorage.decryptString(Buffer.from(entry.cipher, 'base64'))
}

export function recordTestResult(provider: ProviderId, ok: boolean, message: string): void {
  const all = readAll()
  const entry = all[provider]
  if (!entry) return
  entry.lastTested = new Date().toISOString()
  entry.lastTestResult = ok ? 'success' : 'error'
  entry.lastTestMessage = message
  all[provider] = entry
  writeAll(all)
}
