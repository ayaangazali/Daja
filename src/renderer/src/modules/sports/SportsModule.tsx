import { Routes, Route, Navigate } from 'react-router-dom'
import { SportsHome } from './SportsHome'

export function SportsModule(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<SportsHome />} />
      <Route path="*" element={<Navigate to="/sports" replace />} />
    </Routes>
  )
}
