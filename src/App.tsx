import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import AccessGate from './components/AccessGate'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Meeting from './pages/Meeting'
import FamilyForm from './pages/FamilyForm'
import PaperQuestionnaire from './pages/PaperQuestionnaire'
import CeremonyEditor from './pages/CeremonyEditor'
import Biography from './pages/Biography'
import MusicLibrary from './pages/MusicLibrary'
import LiveMode from './pages/LiveMode'
import Projector from './pages/Projector'
import Backup from './pages/Backup'
import Settings from './pages/Settings'
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
import { attachOrphanPhotos, migrateMediaOwnership, removeNaturePhotoLibrary } from './lib/mediaOwnershipMigration'

export default function App() {
  useEffect(() => {
    migrateMediaOwnership()
      .then(removeNaturePhotoLibrary)
      .then(attachOrphanPhotos)
  }, [])

  return (
    <Routes>
      {/* Formulaire ouvert par la famille depuis son lien : public, sans licence. */}
      <Route path="/famille/:id/:key" element={<FamilyForm />} />
      <Route
        path="*"
        element={
          <AccessGate>
            <Routes>
              <Route path="/projector/:id" element={<Projector />} />
              <Route path="/ceremonies/:id/live" element={<LiveMode />} />
              <Route path="/ceremonies/:id/questionnaire" element={<PaperQuestionnaire />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/rencontre" element={<Dashboard module="rencontre" />} />
                <Route path="/conception" element={<Dashboard module="conception" />} />
                <Route path="/regie" element={<Dashboard module="regie" />} />
                <Route path="/dossiers" element={<Dashboard />} />
                <Route path="/ceremonies/:id" element={<CeremonyEditor />} />
                <Route path="/ceremonies/:id/rencontre" element={<Meeting />} />
                <Route path="/ceremonies/:id/biographie" element={<Biography />} />
                <Route path="/musique" element={<MusicLibrary />} />
                <Route path="/sauvegarde" element={<Backup />} />
                <Route path="/parametres" element={<Settings />} />
              </Route>
            </Routes>
            <PwaUpdatePrompt />
          </AccessGate>
        }
      />
    </Routes>
  )
}
