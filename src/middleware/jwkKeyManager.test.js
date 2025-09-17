describe('jwkKeyManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('returns public JWK with computed kid and private key; results are cloned', async () => {
    // Arrange mocks for 'jose'
    const privKey = { k: 'priv' };
    const pubKey = { k: 'pub' };
    let exportedPubJwk;

    const generateKeyPair = jest.fn(async () => ({ privateKey: privKey, publicKey: pubKey }));
    const exportJWK = jest.fn(async (key) => {
      if (key === privKey) return { kty: 'RSA', d: 'secret' };
      if (key === pubKey) {
        exportedPubJwk = { kty: 'RSA', n: 'mod', e: 'AQAB' };
        return exportedPubJwk;
      }
      throw new Error('unexpected key');
    });
    const calculateJwkThumbprint = jest.fn(async () => 'kid123');

    jest.doMock('jose', () => ({
      __esModule: true,
      generateKeyPair,
      exportJWK,
      calculateJwkThumbprint,
    }));

    // eslint-disable-next-line global-require
    const { getPublicJwk, getPrivateJwk } = require('./jwkKeyManager');

    const pub1 = await getPublicJwk();
    const priv1 = await getPrivateJwk();

    expect(pub1).toEqual({ ...exportedPubJwk, kid: 'kid123' });
    expect(pub1).not.toBe(exportedPubJwk);

    expect(priv1).toEqual(privKey);
    expect(priv1).not.toBe(privKey);

    const pub2 = await getPublicJwk();
    expect(generateKeyPair).toHaveBeenCalledTimes(1);
    expect(pub2).toEqual(pub1);

    pub1.kid = 'hacked';
    const pub3 = await getPublicJwk();
    expect(pub3.kid).toBe('kid123');
  });

  test('throws a helpful error when key generation fails', async () => {
    const generateKeyPair = jest.fn(async () => {
      throw new Error('boom');
    });

    jest.doMock('jose', () => ({
      __esModule: true,
      generateKeyPair,
      exportJWK: jest.fn(),
      calculateJwkThumbprint: jest.fn(),
    }));
    // eslint-disable-next-line global-require
    const { getPublicJwk } = require('./jwkKeyManager');

    await expect(getPublicJwk()).rejects.toThrow('Failed to generate key pair: boom');
  });

  test('calculateJwkThumbprint is called with the exported public JWK', async () => {
    const privKey = { k: 'priv' };
    const pubKey = { k: 'pub' };
    const exportedPub = { kty: 'RSA', n: 'N', e: 'AQAB' };

    const generateKeyPair = jest.fn(async () => ({ privateKey: privKey, publicKey: pubKey }));
    const exportJWK = jest.fn(async (key) => (key === pubKey ? exportedPub : { kty: 'RSA', d: 'd' }));
    const calculateJwkThumbprint = jest.fn(async () => 'kidXYZ');

    jest.doMock('jose', () => ({
      __esModule: true,
      generateKeyPair,
      exportJWK,
      calculateJwkThumbprint,
    }));
    // eslint-disable-next-line global-require
    const { getPublicJwk } = require('./jwkKeyManager');

    await getPublicJwk();

    expect(exportJWK).toHaveBeenCalledWith(pubKey);
    expect(calculateJwkThumbprint).toHaveBeenCalledWith(exportedPub);
  });
});
