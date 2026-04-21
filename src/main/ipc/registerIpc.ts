import { ipcMain } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS, ProviderIdSchema, AIProviderIdSchema, ModuleIdSchema } from '../../shared/ipc'
import {
  listKeys,
  setKey,
  deleteKey,
  getKeyPlaintext,
  recordTestResult
} from '../services/keyVault'
import * as prefs from '../services/prefs'
import { testProviderKey } from '../services/providerTest'

const SetKeyPayload = z.object({
  provider: ProviderIdSchema,
  key: z.string().min(1)
})
const DeleteKeyPayload = z.object({ provider: ProviderIdSchema })
const TestKeyPayload = z.object({ provider: ProviderIdSchema })
const SetAiModulePayload = z.object({ module: ModuleIdSchema, provider: AIProviderIdSchema })
const SetModelPayload = z.object({ provider: AIProviderIdSchema, model: z.string().min(1) })
const SetThemePayload = z.object({ theme: z.enum(['dark', 'light']) })

export function registerKeyVaultIpc(): void {
  ipcMain.handle(IPC_CHANNELS.keysList, () => listKeys())

  ipcMain.handle(IPC_CHANNELS.keysSet, async (_e, raw) => {
    const { provider, key } = SetKeyPayload.parse(raw)
    setKey(provider, key)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.keysDelete, async (_e, raw) => {
    const { provider } = DeleteKeyPayload.parse(raw)
    deleteKey(provider)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.keysTest, async (_e, raw) => {
    const { provider } = TestKeyPayload.parse(raw)
    const plaintext = getKeyPlaintext(provider)
    if (!plaintext) return { ok: false, message: 'No key configured' }
    const result = await testProviderKey(provider, plaintext)
    recordTestResult(provider, result.ok, result.message)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.prefsGet, () => prefs.getAll())

  ipcMain.handle(IPC_CHANNELS.prefsSetAiModule, async (_e, raw) => {
    const { module, provider } = SetAiModulePayload.parse(raw)
    prefs.setAiForModule(module, provider)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.prefsSetModel, async (_e, raw) => {
    const { provider, model } = SetModelPayload.parse(raw)
    prefs.setModelForProvider(provider, model)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.prefsSetTheme, async (_e, raw) => {
    const { theme } = SetThemePayload.parse(raw)
    prefs.setTheme(theme)
    return { ok: true }
  })
}
