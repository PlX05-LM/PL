import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import CeremonyEditor from './pages/CeremonyEditor'
import MusicLibrary from './pages/MusicLibrary'
import PhotoLibrary from './pages/PhotoLibrary'
import LiveMode from './pages/LiveMode'
import Projector from './pages/Projector'

export default function App() {
  return (
    <Routes>
      <Route path="/projector/:id" element={<Projector />} />
      <Route path="/ceremonies/:id/live" element={<LiveMode />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ceremonies/:id" element={<CeremonyEditor />} />
        <Route path="/musique" element={<MusicLibrary />} />
        <Route path="/photos" element={<PhotoLibrary />} />
      </Route>
    </Routes>
  )
}
