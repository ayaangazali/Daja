import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const navigate = useNavigate()
  const isFullbleed =
    location.pathname === '/' ||
    location.pathname === '' ||
    location.pathname === '/quick-setup'

  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || el?.isContentEditable) return
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setCheatsheetOpen((v) => !v)
      }
      // Cmd/Ctrl + H → back to launchpad
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        navigate('/')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [navigate])

  // Full-bleed Launchpad / Quick Setup: hide TopBar + sidebar + StatusBar
  if (isFullbleed) {
    return (
      <div className="flex h-full flex-col">
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
        <CommandPalette />
        <KeyboardCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
      </div>
    )
  }

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
