const { webcrypto } = require('crypto');

if (!global.crypto || !global.crypto.subtle) {
  global.crypto = webcrypto;
}

jest.mock('jose', () => ({
  calculateJwkThumbprint: jest.fn().mockResolvedValue('thumb-123'),
  importJWK: jest.fn().mockResolvedValue({ __cryptoKey: true }),
}), { virtual: true });

const jose = require('jose');

// Seed env before loading module under test
const FAKE_PRIV_JWK = {
  kty: 'RSA',
  n: 'test-n',
  e: 'AQAB',
  d: 'test-d',
  p: 'test-p',
  q: 'test-q',
  dp: 'test-dp',
  dq: 'test-dq',
  qi: 'test-qi',
  alg: 'RS256',
  use: 'sig',
};
const BASE64_ENV = Buffer.from(JSON.stringify(FAKE_PRIV_JWK)).toString(
  'base64',
);
process.env.PRIVATE_JWK_64 = process.env.PRIVATE_JWK_64 || BASE64_ENV;

const mgr = require('./jwkKeyManager');

function extractJwk(obj) {
  return obj && obj.key ? obj.key : obj;
}

describe('jwkKeyManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns public JWK with computed kid and cloned results', async () => {
    const pub1 = await mgr.getPublicJwk();
    const pub2 = await mgr.getPublicJwk();

    expect(pub1.kid).toBe('thumb-123');
    expect(pub2.kid).toBe('thumb-123');

    const j1 = extractJwk(pub1);
    expect(j1).toMatchObject({
      kty: 'RSA',
      n: 'test-n',
      e: 'AQAB',
      alg: 'RS256',
      use: 'sig',
    });
    expect(j1.d).toBeUndefined();

    const j2 = extractJwk(pub2);
    expect(j1).not.toBe(j2);

    j1.n = 'mutated';
    const pub3 = await mgr.getPublicJwk();
    const j3 = extractJwk(pub3);
    expect(j3.n).toBe('test-n');

    expect(jose.calculateJwkThumbprint).toHaveBeenCalledTimes(1);
  });

  test('returns private key and handles caching/cloning appropriately', async () => {
    const priv1 = await mgr.getPrivateJwk();
    const priv2 = await mgr.getPrivateJwk();

    expect(priv1.kid).toBe('thumb-123');

    const k1 = extractJwk(priv1);
    const k2 = extractJwk(priv2);

    // To keep the linter happy
    const isKey1 = Boolean(k1 && Object.prototype.hasOwnProperty.call(k1, '__cryptoKey'));
    const isKey2 = Boolean(k2 && Object.prototype.hasOwnProperty.call(k2, '__cryptoKey'));

    // Impl must be consistent across calls (both key or both JWK)
    expect(isKey1).toBe(isKey2);

    // If CryptoKey, it should be cached (same ref); if JWK, it should be cloned (different ref)
    const cachingInvariant = (isKey1 && k1 === k2) || (!isKey1 && k1 !== k2);
    expect(cachingInvariant).toBe(true);

    // If JWK, it should have the expected shape;
    const jwkShapeOk = isKey1
      ? true
      : (
        k1.kty === 'RSA'
          && k1.n === 'test-n'
          && k1.e === 'AQAB'
          && k1.d === 'test-d'
          && k1.alg === 'RS256'
          && k1.use === 'sig'
      );
    expect(jwkShapeOk).toBe(true);

    // Mutation shouldn’t leak for JWK; for CryptoKey, the next call should still be the same key
    let mutationInvariant = true;
    if (!isKey1) {
      const origD = k1.d;
      k1.d = 'mutated';
      const priv3 = await mgr.getPrivateJwk();
      const k3 = extractJwk(priv3);
      mutationInvariant = k3.d === origD;
    } else {
      const priv3 = await mgr.getPrivateJwk();
      const k3 = extractJwk(priv3);
      mutationInvariant = k3 === k2;
    }
    expect(mutationInvariant).toBe(true);

    // With cache + clearAllMocks(), this may be 0 (warm cache from public) or 1 (first touch here)
    expect(jose.calculateJwkThumbprint.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

/* eslint-disable global-require */
describe('jwkKeyManager (env errors)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, ORIGINAL_ENV);
  });

  test('throws a helpful error when PRIVATE_JWK_64 is missing', async () => {
    delete process.env.PRIVATE_JWK_64;

    jest.resetModules();
    require('jose');
    const underTest = require('./jwkKeyManager');

    await expect(underTest.getPublicJwk()).rejects.toThrow(
      /PRIVATE_JWK_64|jwk/i,
    );
  });

  test('throws on invalid base64/JSON in PRIVATE_JWK_64', async () => {
    process.env.PRIVATE_JWK_64 = Buffer.from('not-json').toString('base64');

    jest.resetModules();
    require('jose');
    const underTest = require('./jwkKeyManager');

    await expect(underTest.getPublicJwk()).rejects.toThrow(/invalid|json|jwk/i);
  });
});

/* eslint-disable global-require */
describe('jwkKeyManager (signing key caching, isolated)', () => {
  test('returns a cached signing key (importJWK called once in a fresh module)', async () => {
    jest.resetModules();
    const joseLocal = require('jose');
    joseLocal.importJWK.mockClear();

    process.env.PRIVATE_JWK_64 = Buffer.from(
      JSON.stringify({
        kty: 'RSA',
        n: 'test-n',
        e: 'AQAB',
        d: 'test-d',
        alg: 'RS256',
        use: 'sig',
      }),
    ).toString('base64');

    const freshMgr = require('./jwkKeyManager');

    const key1 = await freshMgr.getSigningKey();
    const key2 = await freshMgr.getSigningKey();

    expect(joseLocal.importJWK).toHaveBeenCalledTimes(1);
    const [calledWithJwk, calledWithAlg] = joseLocal.importJWK.mock.calls[0];
    expect(calledWithJwk).toMatchObject({
      d: 'test-d',
      n: 'test-n',
      e: 'AQAB',
    });
    expect(calledWithAlg).toBe('RS256');
    expect(key1).toBe(key2);
  });
});
/* eslint-enable global-require */
