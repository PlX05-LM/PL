// Clé publique de vérification des licences Céréma.
// Générée par `node scripts/generate-license-key.mjs` — sûre à publier :
// elle ne permet que de VÉRIFIER une clé d'activation, jamais d'en fabriquer
// une nouvelle (seule la clé privée, gardée hors du dépôt, le permet).
export const PUBLIC_KEY_JWK: JsonWebKey | null = {
  "key_ops": [
    "verify"
  ],
  "ext": true,
  "kty": "EC",
  "x": "PrLnxM7nGXRPs3WpC5AOD6fMH-JaMJ0NmEWMmTaF5RM",
  "y": "6rLyGTiz8--pXtbSoGYFfjuKrXbmGMWl85vHpEVGeBo",
  "crv": "P-256"
}
