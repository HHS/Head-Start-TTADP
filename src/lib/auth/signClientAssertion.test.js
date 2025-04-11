import signClientAssertion from './signClientAssertion';
import { importJWK, SignJWT } from 'jose';

jest.mock('jose');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'mock-jti'),
}));

describe('signClientAssertion', () => {
  beforeEach(() => {
    process.env.PRIVATE_JWK_BASE64 = Buffer.from(JSON.stringify({
      kty: 'RSA',
      e: 'AQAB',
      n: 'mockN',
      d: 'mockD',
      p: 'mockP',
      q: 'mockQ',
      dp: 'mockDP',
      dq: 'mockDQ',
      qi: 'mockQI',
      alg: 'RS256',
      ext: true,
    })).toString('base64');

    process.env.AUTH_CLIENT_ID = 'mock-client-id';
    process.env.AUTH_BASE = 'https://mock-auth.com';

    jest.clearAllMocks();
  });

  it('generates a signed JWT using the imported JWK', async () => {
    const mockKey = { kid: 'mock-key' };
    importJWK.mockResolvedValue(mockKey);

    const mockSign = jest.fn().mockResolvedValue('signed.jwt.token');
    const mockSetProtectedHeader = jest.fn().mockReturnValue({ 
      setIssuedAt: jest.fn().mockReturnValue({
        setExpirationTime: jest.fn().mockReturnValue({
          sign: mockSign,
        }),
      }),
    });

    SignJWT.mockImplementation(() => ({
      setProtectedHeader: mockSetProtectedHeader,
    }));

    const result = await signClientAssertion();

    expect(importJWK).toHaveBeenCalledWith(expect.any(Object), 'RS256');
    expect(SignJWT).toHaveBeenCalledWith(expect.objectContaining({
      iss: 'mock-client-id',
      sub: 'mock-client-id',
      aud: 'https://mock-auth.com/oidc/api/openid_connect/token',
      jti: 'mock-jti',
    }));
    expect(mockSign).toHaveBeenCalledWith(mockKey);
    expect(result).toBe('signed.jwt.token');
  });
});
