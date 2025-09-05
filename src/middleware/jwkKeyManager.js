import {
  generateKeyPair,
  exportJWK,
  calculateJwkThumbprint,
} from 'jose';

let jwkKeys; // singleton

async function generateKeys() {
  let keys;
  try {
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      modulusLength: 2048,
      extractable: true,
    });
    keys = {
      privateKey,
      publicKey,
      jwkPrivateKey: await exportJWK(privateKey),
      jwkPublicKey: await exportJWK(publicKey),
    };

    // Compute a deterministic kid from the public JWK
    keys.jwkPublicKey.kid = await calculateJwkThumbprint(keys.jwkPublicKey);
    keys.jwkPrivateKey.kid = keys.jwkPublicKey.kid;
  } catch (error) {
    throw new Error(`Failed to generate key pair: ${error.message}`);
  }
  return keys;
}

/** Initialize JWK keys */
async function ensureKeys() {
  if (!jwkKeys) {
    jwkKeys = await generateKeys();
  }
}

/** Return the public JWK (used for JWKS). */
export async function getPublicJwk() {
  await ensureKeys();
  return structuredClone(jwkKeys.jwkPublicKey);
}

/** Return the private JWK (used for signing). */
export async function getPrivateJwk() {
  await ensureKeys();
  return structuredClone(jwkKeys.privateKey);
}
