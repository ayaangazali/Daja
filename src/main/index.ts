import { app, shell, BrowserWindow, Menu, type MenuItemConstructorOptions, screen } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerKeyVaultIpc } from './ipc/registerIpc'
import { registerDbIpc } from './ipc/dbIpc'
import { registerAiIpc } from './ipc/aiIpc'
import { registerFinanceIpc } from './ipc/financeIpc'
import { registerSportsIpc } from './ipc/sportsIpc'
import { registerPdfIpc } from './ipc/pdfIpc'
import { openDatabase, closeDatabase } from './db/client'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
}

function windowStateFile(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState {
  const file = windowStateFile()
  const fallback: WindowState = { width: 1440, height: 900, maximized: false }
  try {
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as WindowState
      // Sanity-check: ensure the restored bounds intersect an available display.
      const displays = screen.getAllDisplays()
      if (parsed.x != null && parsed.y != null) {
        const visible = displays.some(
          (d) =>
            (parsed.x ?? 0) < d.bounds.x + d.bounds.width &&
            (parsed.x ?? 0) + parsed.width > d.bounds.x &&
            (parsed.y ?? 0) < d.bounds.y + d.bounds.height &&
            (parsed.y ?? 0) + parsed.height > d.bounds.y
        )
        if (!visible) {
          // Monitor disconnected — fall back to primary
          return { ...fallback, maximized: parsed.maximized }
        }
      }
      return {
        width: Math.max(800, parsed.width || fallback.width),
        height: Math.max(600, parsed.height || fallback.height),
        x: parsed.x,
        y: parsed.y,
        maximized: !!parsed.maximized
      }
    }
  } catch {
    /* fallthrough to default */
  }
  return fallback
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getNormalBounds()
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: win.isMaximized()
    }
    writeFileSync(windowStateFile(), JSON.stringify(state), 'utf8')
  } catch (err) {
    console.error('saveWindowState failed:', err)
  }
}

function buildAppMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Settings…',
                accelerator: 'Cmd+,',
                click: () => mainWindow.webContents.send('menu:navigate', '/settings')
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          } as MenuItemConstructorOptions
        ])
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Trade',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: () => mainWindow.webContents.send('menu:navigate', '/finance/portfolio?tab=tools')
        },
        {
          label: 'Launchpad',
          accelerator: isMac ? 'Cmd+H' : 'Ctrl+H',
          click: () => mainWindow.webContents.send('menu:navigate', '/')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette',
          accelerator: isMac ? 'Cmd+K' : 'Ctrl+K',
          click: () => mainWindow.webContents.send('menu:command-palette')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        ...(is.dev ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([{ type: 'separator' }, { role: 'front' }] as MenuItemConstructorOptions[])
          : [])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Report an Issue',
          click: () => shell.openExternal('https://github.com/ayaangazali/Daja/issues')
        },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/ayaangazali/Daja')
        }
      ]
    }
  ]
  return Menu.buildFromTemplate(template)
}

function createWindow(): void {
  const state = loadWindowState()
  const mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0b0d10',
    autoHideMenuBar: process.platform !== 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Sandbox: preload only uses contextBridge + ipcRenderer + type imports,
      // which are sandbox-safe. electronAPI from @electron-toolkit/preload is
      // also sandbox-compatible. Enabling sandbox is defense-in-depth against
      // compromised renderer.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  if (state.maximized) mainWindow.maximize()

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Persist bounds on close + on any intentional move/resize (debounced).
  let saveTimer: NodeJS.Timeout | null = null
  const scheduleSave = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 500)
  }
  mainWindow.on('resize', scheduleSave)
  mainWindow.on('move', scheduleSave)
  mainWindow.on('maximize', scheduleSave)
  mainWindow.on('unmaximize', scheduleSave)
  mainWindow.on('close', () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveWindowState(mainWindow)
  })

  Menu.setApplicationMenu(buildAppMenu(mainWindow))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.daja.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  openDatabase()
  registerKeyVaultIpc()
  registerDbIpc()
  registerAiIpc()
  registerFinanceIpc()
  registerSportsIpc()
  registerPdfIpc()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})
