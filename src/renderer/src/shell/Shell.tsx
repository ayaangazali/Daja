import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { ModuleSwitcher } from './ModuleSwitcher'
import { CommandPalette } from './CommandPalette'
import { KeyboardCheatsheet } from './KeyboardCheatsheet'
import { StatusBar } from './StatusBar'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/cn'

export function Shell(): React.JSX.Element {
  useKeyboardNav()
  const focusMode = useUIStore((s) => s.focusMode)
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setCheatsheetOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {!focusMode && <TopBar />}
      <div className="flex min-h-0 flex-1">
        <div className={cn(focusMode && 'hidden')}>
          <ModuleSwitcher />
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      {!focusMode && <StatusBar />}
      <CommandPalette />
      <KeyboardCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
    </div>
  )
}
