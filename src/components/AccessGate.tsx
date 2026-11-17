import { useEffect, useState, type ReactNode } from 'react'
import { isLicenseExpired, verifyLicenseKey } from '../lib/licensing/license'
import { setServiceLicence } from '../lib/serviceAuth'
import { exportFullBackup } from '../lib/backup'
import { contactEmail } from '../legal/editor'
import LegalLinks from './LegalLinks'
import {
  activateLicense,
  createAccount,
  getVerifiedLicense,
  listAccounts,
  loadSession,
  saveSession,
  verifyLogin,
} from '../lib/licensing/store'
import type { AccountRecord, LicenseRecord } from '../lib/licensing/types'

type Stage = 'loading' | 'activation' | 'expired' | 'create-account' | 'login' | 'unlocked'

const formatDay = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const inputClass =
  'w-full rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm text-fg outline-none focus:border-gold-dim'

export default function AccessGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [license, setLicense] = useState<LicenseRecord | null>(null)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])

  const [keyInput, setKeyInput] = useState('')
  const [activationError, setActivationError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  async function refresh() {
    const lic = await getVerifiedLicense()
    setLicense(lic)
    if (!lic) {
      setServiceLicence(null)
      setStage('activation')
      return
    }
    if (isLicenseExpired(lic)) {
      setServiceLicence(null)
      setStage('expired')
      return
    }
    setServiceLicence(lic.token)
    const accs = await listAccounts()
    setAccounts(accs)
    if (accs.length === 0) {
      setStage('create-account')
      return
    }
    const session = loadSession()
    if (session && accs.some((a) => a.id === session.accountId)) {
      setStage('unlocked')
    } else {
      setStage('login')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleActivate() {
    setActivationError(null)
    setActivating(true)
    try {
      const payload = await verifyLicenseKey(keyInput)
      if (!payload) {
        setActivationError("Clé d'activation invalide.")
        return
      }
      if (isLicenseExpired(payload)) {
        setActivationError(`Cette clé a expiré le ${formatDay(payload.expiresAt!)}.`)
        return
      }
      await activateLicense(keyInput.trim(), payload)
      setKeyInput('')
      await refresh()
    } finally {
      setActivating(false)
    }
  }

  async function handleCreateAccount() {
    setCreateError(null)
    if (!newUsername.trim()) {
      setCreateError('Choisissez un identifiant.')
      return
    }
    if (newPassword.length < 8) {
      setCreateError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setCreateError('Les mots de passe ne correspondent pas.')
      return
    }
    const existing = await listAccounts()
    if (license && existing.length >= license.seats) {
      setCreateError(`Cette licence est limitée à ${license.seats} identifiant(s).`)
      return
    }
    if (existing.some((a) => a.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setCreateError('Cet identifiant existe déjà.')
      return
    }
    const account = await createAccount(newUsername, newPassword)
    saveSession({ accountId: account.id, username: account.username })
    setStage('unlocked')
  }

  async function handleLogin() {
    setLoginError(null)
    const account = await verifyLogin(loginUsername, loginPassword)
    if (!account) {
      setLoginError('Identifiant ou mot de passe incorrect.')
      return
    }
    saveSession({ accountId: account.id, username: account.username })
    setStage('unlocked')
  }

  if (stage === 'loading') return null
  if (stage === 'unlocked') return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6">
        <h1 className="mb-1 font-display text-xl tracking-wide text-gold">Céréo</h1>

        {(stage === 'activation' || stage === 'expired') && (
          <>
            {stage === 'expired' && license?.expiresAt ? (
              <div className="mb-4 space-y-3">
                <p className="text-sm text-fg">
                  L'abonnement Céréo ({license.customer}) a pris fin le {formatDay(license.expiresAt)}.
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  Vos dossiers sont toujours sur ce poste. Téléchargez-en une copie à tout moment, ou entrez la
                  nouvelle clé reçue au renouvellement.
                </p>
                <button
                  onClick={() => exportFullBackup().catch(() => setActivationError('La sauvegarde a échoué.'))}
                  className="w-full rounded-md border border-gold-dim px-4 py-2 text-sm text-gold hover:bg-panel-2"
                >
                  Télécharger une sauvegarde de mes dossiers
                </button>
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                <p className="text-sm leading-relaxed text-fg">
                  Le logiciel des cérémonies funéraires : rencontre avec la famille, textes rédigés, diaporama et régie
                  le jour J.
                </p>
                <p className="text-sm text-muted">Entrez la clé d'activation reçue avec votre abonnement.</p>
              </div>
            )}
            <textarea
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              rows={3}
              placeholder="CEREO-…"
              className="w-full resize-none rounded-md border border-line bg-panel-2 px-2 py-1.5 font-mono text-xs text-fg outline-none focus:border-gold-dim"
            />
            {activationError && <p className="mt-2 text-xs text-danger">{activationError}</p>}
            <button
              onClick={handleActivate}
              disabled={activating || !keyInput.trim()}
              className="mt-4 w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
            >
              {activating ? 'Vérification…' : 'Activer'}
            </button>
            {stage === 'activation' && contactEmail() && (
              <a
                href={`mailto:${contactEmail()}?subject=${encodeURIComponent('Essai gratuit de Céréo')}`}
                className="mt-3 block w-full rounded-md border border-line px-4 py-2 text-center text-sm text-fg hover:border-gold-dim"
              >
                Pas encore de clé ? Demander un essai gratuit de 30 jours
              </a>
            )}
          </>
        )}

        {stage === 'create-account' && (
          <>
            <p className="mb-4 text-sm text-muted">
              {license ? `Licence activée pour ${license.customer}. ` : ''}
              Choisissez votre identifiant et votre mot de passe.
            </p>
            <div className="space-y-2">
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Identifiant"
                className={inputClass}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mot de passe (8 caractères min.)"
                className={inputClass}
              />
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
              />
            </div>
            {createError && <p className="mt-2 text-xs text-danger">{createError}</p>}
            <button
              onClick={handleCreateAccount}
              className="mt-4 w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
            >
              Créer mon compte
            </button>
          </>
        )}

        {stage === 'login' && (
          <>
            <p className="mb-4 text-sm text-muted">Connectez-vous pour accéder à Céréo.</p>
            <div className="space-y-2">
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Identifiant"
                className={inputClass}
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Mot de passe"
                className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {loginError && <p className="mt-2 text-xs text-danger">{loginError}</p>}
            <button
              onClick={handleLogin}
              className="mt-4 w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
            >
              Se connecter
            </button>
            {license && accounts.length < license.seats && (
              <button
                onClick={() => setStage('create-account')}
                className="mt-2 w-full text-xs text-muted hover:text-fg"
              >
                + Ajouter un identifiant de l'agence ({accounts.length}/{license.seats} utilisés)
              </button>
            )}
          </>
        )}
        <LegalLinks className="mt-6 border-t border-line pt-4" />
      </div>
    </div>
  )
}
