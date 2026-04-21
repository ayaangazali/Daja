import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { ModuleSwitcher } from './ModuleSwitcher'
import { CommandPalette } from './CommandPalette'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { useUIStore } from '../stores/uiStore'
import { cn } from '../lib/cn'

export function Shell(): React.JSX.Element {
  useKeyboardNav()
  const focusMode = useUIStore((s) => s.focusMode)
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
      <CommandPalette />
    </div>
  )
}
