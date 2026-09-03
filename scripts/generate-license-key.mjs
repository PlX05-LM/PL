#!/usr/bin/env node
// Outil vendeur — à exécuter UNIQUEMENT sur votre propre ordinateur, jamais
// distribué avec l'application. Génère (une seule fois) une paire de clés
// ECDSA P-256, puis signe une clé d'activation par client.
//
// Usage :
//   node scripts/generate-license-key.mjs "Pompes Funèbres Dupont" 3
//   (nom du client, puis nombre de postes/identifiants inclus — 1 par défaut)
//
// La clé privée (license-private-key.json) est générée à côté de ce script
// si elle n'existe pas encore, et n'est JAMAIS committée (voir .gitignore).
// Gardez-la précieusement : elle seule permet de fabriquer de nouvelles clés
// d'activation valides pour les applications déjà distribuées.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const PRIVATE_KEY_FILE = path.join(scriptDir, '..', 'license-private-key.json')
const PUBLIC_KEY_FILE = path.join(scriptDir, '..', 'src', 'lib', 'licensing', 'publicKey.ts')

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function ensureKeyPair() {
  if (existsSync(PRIVATE_KEY_FILE)) {
    const jwk = JSON.parse(readFileSync(PRIVATE_KEY_FILE, 'utf8'))
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
    return privateKey
  }

  console.log("Aucune clé de signature trouvée : génération d'une nouvelle paire...")
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  writeFileSync(PRIVATE_KEY_FILE, JSON.stringify(privateJwk, null, 2))
  writeFileSync(
    PUBLIC_KEY_FILE,
    `// Clé publique de vérification des licences Céréma.
// Générée par \`node scripts/generate-license-key.mjs\` — sûre à publier :
// elle ne permet que de VÉRIFIER une clé d'activation, jamais d'en fabriquer
// une nouvelle (seule la clé privée, gardée hors du dépôt, le permet).
export const PUBLIC_KEY_JWK: JsonWebKey | null = ${JSON.stringify(publicJwk, null, 2)}
`,
  )

  console.log('')
  console.log('Nouvelle paire de clés générée :')
  console.log(`  - clé privée  : ${PRIVATE_KEY_FILE}`)
  console.log('    À GARDER SECRÈTE — ne jamais la partager ni la committer dans Git.')
  console.log(`  - clé publique intégrée dans : ${PUBLIC_KEY_FILE}`)
  console.log('    Celle-ci doit être committée normalement avec le reste du code.')
  console.log('')

  return keyPair.privateKey
}

async function main() {
  const [, , customer, seatsArg] = process.argv
  if (!customer) {
    console.error('Usage : node scripts/generate-license-key.mjs "Nom du client" [nombre de postes]')
    process.exitCode = 1
    return
  }
  const seats = seatsArg ? parseInt(seatsArg, 10) : 1
  if (!Number.isInteger(seats) || seats < 1) {
    console.error('Le nombre de postes doit être un entier positif.')
    process.exitCode = 1
    return
  }

  const privateKey = await ensureKeyPair()

  const payload = { customer, seats, issuedAt: Date.now(), id: randomUUID() }
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, payloadBytes)
  const token = `CEREMA-${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(new Uint8Array(signature))}`

  console.log('Client :', customer)
  console.log('Postes (identifiants possibles sous cette licence) :', seats)
  console.log('')
  console.log("Clé d'activation à transmettre au client :")
  console.log('')
  console.log(token)
  console.log('')
}

main()
