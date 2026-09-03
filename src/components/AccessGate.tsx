import { useEffect, useState, type ReactNode } from 'react'
import { verifyLicenseKey } from '../lib/licensing/license'
import {
  activateLicense,
  createAccount,
  getLicense,
  listAccounts,
  loadSession,
  saveSession,
  verifyLogin,
} from '../lib/licensing/store'
import type { AccountRecord, LicenseRecord } from '../lib/licensing/types'

type Stage = 'loading' | 'activation' | 'create-account' | 'login' | 'unlocked'

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
    const lic = (await getLicense()) ?? null
    setLicense(lic)
    if (!lic) {
      setStage('activation')
      return
    }
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
      const record = await activateLicense(keyInput.trim(), payload)
      setLicense(record)
      setStage('create-account')
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
    if (newPassword.length < 6) {
      setCreateError('Le mot de passe doit contenir au moins 6 caractères.')
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
        <h1 className="mb-1 font-display text-xl tracking-wide text-gold">Céréma</h1>

        {stage === 'activation' && (
          <>
            <p className="mb-4 text-sm text-muted">
              Entrez la clé d'activation fournie lors de l'achat du logiciel.
            </p>
            <textarea
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              rows={3}
              placeholder="CEREMA-…"
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
                placeholder="Mot de passe (6 caractères min.)"
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
            <p className="mb-4 text-sm text-muted">Connectez-vous pour accéder à Céréma.</p>
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
      </div>
    </div>
  )
}
