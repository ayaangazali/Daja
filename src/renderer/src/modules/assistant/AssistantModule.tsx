import { Routes, Route, Navigate } from 'react-router-dom'
import { AssistantHome } from './AssistantHome'

export function AssistantModule(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<AssistantHome />} />
      <Route path="*" element={<Navigate to="/assistant" replace />} />
    </Routes>
  )
}
