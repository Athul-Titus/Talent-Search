import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Ranking from './pages/Ranking'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/upload"     element={<Upload />} />
            <Route path="/upload/:jobId" element={<Upload />} />
            <Route path="/ranking"    element={<Ranking />} />
            <Route path="/ranking/:jobId" element={<Ranking />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
