import authMiddleware from './authMiddleware';

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
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});
