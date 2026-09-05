import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import AccessGate from './components/AccessGate'
import Dashboard from './pages/Dashboard'
import CeremonyEditor from './pages/CeremonyEditor'
import Biography from './pages/Biography'
import MusicLibrary from './pages/MusicLibrary'
import LiveMode from './pages/LiveMode'
import Projector from './pages/Projector'
import Backup from './pages/Backup'
import Settings from './pages/Settings'
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
import { migrateMediaOwnership, removeNaturePhotoLibrary } from './lib/mediaOwnershipMigration'

export default function App() {
  useEffect(() => {
    migrateMediaOwnership()
    removeNaturePhotoLibrary()
  }, [])

  return (
    <AccessGate>
      <Routes>
        <Route path="/projector/:id" element={<Projector />} />
        <Route path="/ceremonies/:id/live" element={<LiveMode />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ceremonies/:id" element={<CeremonyEditor />} />
          <Route path="/ceremonies/:id/biographie" element={<Biography />} />
          <Route path="/musique" element={<MusicLibrary />} />
          <Route path="/sauvegarde" element={<Backup />} />
          <Route path="/parametres" element={<Settings />} />
        </Route>
      </Routes>
      <PwaUpdatePrompt />
    </AccessGate>
  )
}
