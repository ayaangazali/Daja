import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { ModuleSwitcher } from './ModuleSwitcher'
import { CommandPalette } from './CommandPalette'
import { useKeyboardNav } from '../hooks/useKeyboardNav'

export function Shell(): React.JSX.Element {
  useKeyboardNav()
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ModuleSwitcher />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
