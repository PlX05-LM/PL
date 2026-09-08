import { useEffect, useState } from 'react'
import { changePassword, getLicense, listAccounts, loadSession } from '../lib/licensing/store'
import type { AccountRecord, LicenseRecord } from '../lib/licensing/types'
import { loadAppSettings, saveAppSettings, type AppSettings } from '../lib/appSettings'
import { generateSegmentTextAI } from '../lib/aiGeneration'

const inputClass =
  'w-full rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm text-fg outline-none focus:border-gold-dim'

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())
  const [license, setLicense] = useState<LicenseRecord | null>(null)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const session = loadSession()

  useEffect(() => {
    getLicense().then((l) => setLicense(l ?? null))
    listAccounts().then(setAccounts)
  }, [])

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveAppSettings(next)
  }

  const [testingAi, setTestingAi] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<'ok' | 'error' | null>(null)
  const [aiTestMessage, setAiTestMessage] = useState<string | null>(null)

  async function handleTestAi() {
    setTestingAi(true)
    setAiTestResult(null)
    setAiTestMessage(null)
    try {
      await generateSegmentTextAI({
        ceremonyType: 'autre',
        segmentTitle: 'Test de connexion',
        instructions:
          "Ceci est un test de connexion depuis les Paramètres de l'application. Réponds simplement par une phrase confirmant que la connexion fonctionne.",
      })
      setAiTestResult('ok')
    } catch (err) {
      setAiTestResult('error')
      setAiTestMessage(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setTestingAi(false)
    }
  }

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordSuccess(false)
    if (!session) return
    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    const ok = await changePassword(session.accountId, oldPassword, newPassword)
    if (!ok) {
      setPasswordError('Mot de passe actuel incorrect.')
      return
    }
    setPasswordSuccess(true)
    setOldPassword('')
    setNewPassword('')
    setNewPasswordConfirm('')
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h2 className="mb-6 font-display text-3xl text-fg">Paramètres</h2>

      <section className="mb-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Prompteur</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm text-fg">Afficher le prompteur en régie</span>
          <input
            type="checkbox"
            checked={settings.showTeleprompter}
            onChange={(e) => update('showTeleprompter', e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
        </label>
        <p className="mb-4 text-xs text-muted">
          À désactiver si vous lisez depuis des notes papier — le déroulé et la navigation entre
          étapes restent disponibles, seul le texte défilant disparaît.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">
            Taille de texte par défaut
            <input
              type="number"
              min={20}
              max={80}
              value={settings.defaultFontSize}
              onChange={(e) => update('defaultFontSize', Number(e.target.value))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs text-muted">
            Vitesse de défilement par défaut
            <input
              type="number"
              min={5}
              max={100}
              value={settings.defaultScrollSpeed}
              onChange={(e) => update('defaultScrollSpeed', Number(e.target.value))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Repères de régie</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm text-fg">Afficher le compteur d'avance/retard</span>
          <input
            type="checkbox"
            checked={settings.showPaceIndicator}
            onChange={(e) => update('showPaceIndicator', e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
        </label>
        <p className="text-xs text-muted">
          Compare le temps écoulé à la durée prévue des étapes déjà passées, affiché dans l'en-tête
          de la régie une fois le chronomètre démarré.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Musique</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm text-fg">Masquer la bibliothèque libre de droit</span>
          <input
            type="checkbox"
            checked={settings.hideBuiltInLibrary}
            onChange={(e) => update('hideBuiltInLibrary', e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
        </label>
        <p className="mb-4 text-xs text-muted">
          Utile si votre agence utilise exclusivement ses propres musiques : les 20 pistes fournies
          restent en mémoire mais disparaissent des sélecteurs (régie et fiche cérémonie).
        </p>
        <label className="text-xs text-muted">
          Durée du fondu de sortie (secondes)
          <input
            type="number"
            min={0.5}
            max={15}
            step={0.5}
            value={settings.defaultFadeOutSeconds}
            onChange={(e) => update('defaultFadeOutSeconds', Number(e.target.value))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Durée du fondu déclenché par le bouton « Fondu ↘ » en régie.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Check-list technique</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm text-fg">Activer la check-list avant le direct</span>
          <input
            type="checkbox"
            checked={settings.enablePreCeremonyChecklist}
            onChange={(e) => update('enablePreCeremonyChecklist', e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
        </label>
        <p className="text-xs text-muted">
          Désactivée par défaut. Une fois activée, un bouton « ✅ Check-list » apparaît dans l'en-tête
          de la régie pour repasser en revue les points techniques usuels (sortie audio, musiques,
          diaporama, projection…) avant de démarrer.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Génération de texte par IA</h3>
        <p className="mb-4 text-xs text-muted">
          Optionnelle et désactivée par défaut : l'application reste 100% locale sans cette
          configuration. Une fois activée, elle vient s'ajouter au générateur local (sans IA,
          toujours disponible) pour l'ébauche biographique et les étapes du déroulé. Nécessite une
          connexion internet — indisponible par exemple lors d'une cérémonie en cimetière hors
          réseau ; l'application détecte automatiquement l'absence de réseau et propose alors le
          générateur local. Un service à héberger vous-même : voir{' '}
          <code className="text-fg">worker/README.md</code> dans le dépôt du projet pour le mettre
          en place.
        </p>
        <label className="mb-3 block text-xs text-muted">
          Adresse du service (URL du worker)
          <input
            value={settings.aiEndpointUrl}
            onChange={(e) => update('aiEndpointUrl', e.target.value)}
            placeholder="https://cerema-ai-proxy.votre-compte.workers.dev"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="mb-3 block text-xs text-muted">
          Jeton d'application
          <input
            type="password"
            value={settings.aiAppToken}
            onChange={(e) => update('aiAppToken', e.target.value)}
            placeholder="le même jeton que celui défini côté service"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <button
          onClick={handleTestAi}
          disabled={testingAi || !settings.aiEndpointUrl.trim() || !settings.aiAppToken.trim()}
          className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold disabled:opacity-40"
        >
          {testingAi ? 'Test en cours…' : 'Tester la connexion'}
        </button>
        {aiTestResult === 'ok' && (
          <p className="mt-2 text-xs text-gold">✓ Connexion au service IA réussie.</p>
        )}
        {aiTestResult === 'error' && (
          <p className="mt-2 text-xs text-danger">✕ {aiTestMessage}</p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Compte & licence</h3>
        {license && (
          <p className="mb-3 text-sm text-muted">
            Licence activée pour <span className="text-fg">{license.customer}</span> —{' '}
            {accounts.length}/{license.seats} identifiant(s) utilisé(s).
          </p>
        )}
        {accounts.length > 0 && (
          <ul className="mb-4 space-y-1 text-sm text-muted">
            {accounts.map((a) => (
              <li key={a.id}>
                👤 {a.username} {session?.accountId === a.id && <span className="text-gold">(vous)</span>}
              </li>
            ))}
          </ul>
        )}
        <h4 className="mb-2 text-sm text-fg">Changer mon mot de passe</h4>
        <div className="space-y-2">
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Mot de passe actuel"
            className={inputClass}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className={inputClass}
          />
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            placeholder="Confirmer le nouveau mot de passe"
            className={inputClass}
            onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
          />
        </div>
        {passwordError && <p className="mt-2 text-xs text-danger">{passwordError}</p>}
        {passwordSuccess && <p className="mt-2 text-xs text-gold">Mot de passe mis à jour.</p>}
        <button
          onClick={handleChangePassword}
          className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
        >
          Mettre à jour
        </button>
      </section>
    </div>
  )
}
