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
