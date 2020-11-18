import {} from 'dotenv/config';
import authMiddleware, { login } from './authMiddleware';

describe('authMiddleware', () => {
  it('should allow access if user data is present', async () => {
    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = 2;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should redirect to login if user data is not present', async () => {
    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = undefined;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockResponse.sendStatus).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('login should redirect to HSES', async () => {
    const mockSession = jest.fn();
    mockSession.userId = undefined;
    const mockRequest = {
      path: '/api/login',
      session: mockSession,
      headers: {},
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    login(mockRequest, mockResponse);
    expect(mockResponse.redirect).not.toHaveBeenCalledWith(process.env.TTA_SMART_HUB_URI);
  });
});
