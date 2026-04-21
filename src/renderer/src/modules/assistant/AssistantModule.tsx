import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, Mic } from 'lucide-react'
import { AssistantHome } from './AssistantHome'
import { MeetingNotes } from './MeetingNotes'
import { cn } from '../../lib/cn'

export function AssistantModule(): React.JSX.Element {
  const { pathname } = useLocation()
  const onMeeting = pathname.endsWith('/meeting')
  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <NavLink
          to="/assistant"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1 px-3 py-2 text-[11px]',
              isActive && !onMeeting
                ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            )
          }
        >
          <MessageSquare className="h-3 w-3" /> Chat
        </NavLink>
        <NavLink
          to="/assistant/meeting"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1 px-3 py-2 text-[11px]',
              isActive
                ? 'border-b-2 border-[var(--color-info)] text-[var(--color-fg)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            )
          }
        >
          <Mic className="h-3 w-3" /> Meeting notes
        </NavLink>
      </div>
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route index element={<AssistantHome />} />
          <Route path="meeting" element={<MeetingNotes />} />
          <Route path="*" element={<Navigate to="/assistant" replace />} />
        </Routes>
      </div>
    </div>
  )
}
