import * as jose from 'jose';
import signClientAssertion from './signClientAssertion';

jest.mock('jose', () => {
  const actual = jest.requireActual('jose');
  return {
    ...actual,
    importJWK: jest.fn(),
    SignJWT: jest.fn(),
  };
});

describe('signClientAssertion', () => {
  beforeAll(() => {
    process.env.PRIVATE_JWK_BASE64 = Buffer.from(JSON.stringify({
      kty: 'RSA',
      n: 'sXchUOWmcphYm1bgR_Nv3s0RtBd8yE3H4eEhD3mK-PXNYeGnI3RtOSgAcEjT1H-fPVy7UtZqk6kmGvEMvXq1jRrQIV6ZpTu7oErLgLEeYp6yoBMuLNceoJ6WejQuFVqRYShDYobJ7S6pNYbKXlXtd-qlNgr9Izh4bkRch23P7sNHoH7ldTZKV8q9SoWYXH0qfz3t8RjSBiWzp3vGMLsHYmWwM6WJJabgIK42FtXzGv3ChXk2rO6U1OzN9fuyhKrk2aa8TzctcXGeYYCViyMvGQWlRHmFwpE_vhRPVUEXqL4MRZjvF7XNLI_BH84F3nMfOQe9kEJhQ5kl25KnCJk0ZkQ',
      e: 'AQAB',
      d: 'ZK3u7Bd-jcGV2lS2e2kKjRSZphsYP9Wc-Q_Kz7ZTxYwYFbTnptChz0cNE3jHPeyIX0Q1csZXUpzV1Xy__uEQP7FwzRU5WKaVjF7rdGnSHq3b-iDzK1wMnwe78pqIxk3GEQnHJLS19OrMvA5v10aNlbOHakJvK-3oPvYEXgxEjELuzNK57s8zwHTIcTFgE8mfyKSuZGjBoCHiLStf3rMysYvBpd1XDwh_nUcmH1quxzL9J3ZTstDNhA-LqHhw4ylmnKnwWnChWEdHLli6He19j_qtQAhN2eZDb-VSCZgbnNuEsF3S-S6REPb-h65ekDGeTVKZ5yIU-9TStnM0gGAt3ogQ',
      p: '9d2uHw1HqQp7zSuHvFuR7x-Z7sL94dC1ni4BP6bEXlMBz0wXzvMNtg68TnUwRRZkYuU1-GpqIzrkEpHndPYSpQ',
      q: 'xFoVJGKxvUp61v8J8rLD3zKqRI00aVZYZgBHvNq4Lq-V77_lGbpc2ZdXZkEWB_t0PY6AwrR65LydNEsRV1aqNw',
      dp: 'Z_EjJZblEbm7wrLRlBiHdZ_6VvhtEYsxTDv9bObHl2zKHwDSeVXVmQ3GeFejOZChBRRV4jcV5RMWezLGQUCZgQ',
      dq: 'AjYxHe0JpGjO_St0Yeqj77_Tq0--ZUbHy0uCEzsnYjILq1vCkUmpX7XxO0CCk81f9h08_SkbcAL6TldxVpbfxQ',
      qi: 'r6a3oV6_7LJ9lmVZ3eVREhi9m3J6hZXrYYE2F96zr-KC3IBYlMQwZC58MumG1AOPnwrxdO_MxAz7SkJUXYJSUw',
      alg: 'RS256',
      ext: true,
    })).toString('base64');
  });

  it('generates a signed JWT using the imported JWK', async () => {
    const mockKey = { kid: 'mock-key' };
    jose.importJWK.mockResolvedValue(mockKey);

    const mockSign = jest.fn().mockResolvedValue('signed.jwt.token');

    const mockSetExpirationTime = jest.fn().mockReturnValue({
      sign: mockSign,
    });

    const mockSetIssuedAt = jest.fn().mockReturnValue({
      setExpirationTime: mockSetExpirationTime,
    });

    const mockSetProtectedHeader = jest.fn().mockReturnValue({
      setIssuedAt: mockSetIssuedAt,
    });

    jose.SignJWT.mockImplementation(() => ({
      setProtectedHeader: mockSetProtectedHeader,
    }));

    const token = await signClientAssertion();

    expect(token).toBe('signed.jwt.token');
    expect(jose.importJWK).toHaveBeenCalled();
    expect(jose.SignJWT).toHaveBeenCalled();
  });
});
