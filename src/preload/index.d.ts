import type { ElectronAPI } from '@electron-toolkit/preload'
import type { NexusBridge } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    nexus: NexusBridge
  }
}
