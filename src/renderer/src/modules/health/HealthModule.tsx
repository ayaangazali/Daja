import { Routes, Route, Navigate } from 'react-router-dom'
import { HealthHome } from './HealthHome'

export function HealthModule(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<HealthHome />} />
      <Route path="*" element={<Navigate to="/health" replace />} />
    </Routes>
  )
}
