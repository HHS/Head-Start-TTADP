const { webcrypto } = require('crypto');

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');

if (!global.crypto || !global.crypto.subtle) {
  global.crypto = webcrypto;
}

describe('jwkKeyManager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.PRIVATE_JWK_64;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('returns public JWK with computed kid and private key; results are cloned', async () => {
    const privateJwk = {
      kty: 'RSA',
      n: 'test-n',
      e: 'AQAB',
      d: 'test-d',
      alg: 'RS256',
      use: 'sig',
    };
    process.env.PRIVATE_JWK_64 = b64(privateJwk);

    jest.doMock('jose', () => ({
      calculateJwkThumbprint: jest.fn().mockResolvedValue('thumb-123'),
      importJWK: jest.fn(async (jwk) => jwk),
    }));

    // eslint-disable-next-line global-require
    const { getPublicJwk, getPrivateJwk } = require('./jwkKeyManager');
    const pub1 = await getPublicJwk();
    const pub2 = await getPublicJwk();
    const priv = await getPrivateJwk();

    expect(pub1.kid).toBe('thumb-123');
    expect(priv).toEqual(
      expect.objectContaining({
        kid: 'thumb-123',
        alg: 'RS256',
        key: expect.objectContaining({ d: 'test-d' }),
      }),
    );

    expect(pub1).not.toHaveProperty('d');
    expect(pub1).not.toHaveProperty('key');

    // Results are cloned (mutating pub1 shouldn’t affect pub2)
    pub1.extra = 'x';
    expect(pub2.extra).toBeUndefined();

    const priv2 = await getPrivateJwk();
    priv.key.extra = 'y';
    expect(priv2.key.extra).toBeUndefined();
  });

  it('calculateJwkThumbprint is called with the exported public JWK', async () => {
    const privateJwk = {
      kty: 'RSA',
      n: 'NNN',
      e: 'AQAB',
      d: 'DDD',
      alg: 'RS256',
      use: 'sig',
    };
    process.env.PRIVATE_JWK_64 = b64(privateJwk);

    const calc = jest.fn().mockResolvedValue('thumb');
    jest.doMock('jose', () => ({
      calculateJwkThumbprint: calc,
      importJWK: jest.fn(async (jwk) => jwk),
    }));

    // eslint-disable-next-line global-require
    const { getPublicJwk } = require('./jwkKeyManager');
    const pub = await getPublicJwk();

    // Called exactly once with a PUBLIC JWK (no private exponent `d`)
    expect(calc).toHaveBeenCalledTimes(1);
    expect(calc).toHaveBeenCalledWith(
      expect.objectContaining({
        kty: 'RSA',
        n: 'NNN',
        e: 'AQAB',
        alg: 'RS256',
      }),
    );
    expect(calc.mock.calls[0][0]).not.toHaveProperty('d');

    // The returned public JWK gets the computed kid
    expect(pub.kid).toBe('thumb');
  });
});
