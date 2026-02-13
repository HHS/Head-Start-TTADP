import { importJWK, calculateJwkThumbprint } from 'jose'
import { webcrypto } from 'crypto'

let cache = null // { privateJwk, publicJwk, signingKey }
const alg = 'RS256'

if (!global.crypto?.subtle) {
  global.crypto = webcrypto
}

function readEnvJson() {
  const b64 = (process.env.PRIVATE_JWK_64 || '').trim()

  if (b64) {
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json)
  }

  throw new Error('Missing private JWK.')
}

/** Build a public JWK from a private RSA JWK by omitting private members. */
function toPublicJwk(privateJwk) {
  const { kty, n, e, kid, alg: jwkAlg, use, x5c, x5t, 'x5t#S256': x5tS256 } = privateJwk
  // Only keep public-safe members.
  const pub = { kty, n, e }
  if (kid) pub.kid = kid
  if (jwkAlg) pub.alg = jwkAlg
  if (use) pub.use = use
  if (x5c) pub.x5c = x5c
  if (x5t) pub.x5t = x5t
  if (x5tS256) pub['x5t#S256'] = x5tS256

  return pub
}

async function ensureLoaded() {
  if (cache) return

  // 1) Read private JWK from env
  const privateJwk = readEnvJson()

  if (privateJwk.kty !== 'RSA') {
    throw new Error('PRIVATE_JWK must be an RSA JWK (kty="RSA").')
  }
  if (!privateJwk.d || !privateJwk.n || !privateJwk.e) {
    throw new Error('PRIVATE_JWK must include RSA fields: n, e, and d.')
  }

  const signingKey = await importJWK(privateJwk, alg)

  const publicJwk = toPublicJwk(privateJwk)
  if (!publicJwk.kid) {
    publicJwk.kid = await calculateJwkThumbprint(publicJwk)
  }

  if (!privateJwk.kid) {
    privateJwk.kid = publicJwk.kid
  }

  cache = { privateJwk, publicJwk, signingKey }
}

/** Returns { key: CryptoKey, alg, kid } for PrivateKeyJwt */
export async function getPrivateJwk() {
  await ensureLoaded()
  return { key: cache.signingKey, alg: cache.alg, kid: cache.privateJwk.kid }
}

/** Returns the public JWK for JWKS endpoint. */
export async function getPublicJwk() {
  await ensureLoaded()
  return typeof structuredClone === 'function' ? structuredClone(cache.publicJwk) : JSON.parse(JSON.stringify(cache.publicJwk))
}

/** Returns the imported signing key. */
export async function getSigningKey() {
  await ensureLoaded()
  return cache.signingKey
}
