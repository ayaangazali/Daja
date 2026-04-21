import { Routes, Route, Navigate } from 'react-router-dom'
import { PdfHome } from './PdfHome'

export function PdfModule(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<PdfHome />} />
      <Route path="*" element={<Navigate to="/pdf" replace />} />
    </Routes>
  )
}
