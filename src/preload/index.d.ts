import type { ElectronAPI } from '@electron-toolkit/preload'
import type { DajaBridge } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    daja: DajaBridge
  }
}
