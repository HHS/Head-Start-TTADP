import { SignJWT, importJWK } from 'jose';
import crypto from 'crypto';

export default async function signClientAssertion() {
  const base64 = process.env.PRIVATE_JWK_BASE64;
  const jwk = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
  const key = await importJWK(jwk, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const tokenEndpoint = `${process.env.AUTH_BASE}/oidc/api/openid_connect/token`;

  return new SignJWT({
    iss: process.env.AUTH_CLIENT_ID,
    sub: process.env.AUTH_CLIENT_ID,
    aud: tokenEndpoint,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}
