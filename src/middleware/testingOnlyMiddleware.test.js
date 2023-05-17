import testingOnly from './testingOnlyMiddleware';

describe('testingOnlyMiddleware', () => {
  let statusCode;
  let message;
  const mockRequest = {
  };
  const mockResponse = {
    status: jest.fn((num) => ({
      send: jest.fn((msg) => {
        statusCode = num;
        message = msg;
      }),
    })),
  };
  const mockNext = () => {};
  afterEach(() => {
    statusCode = undefined;
    message = undefined;
  });
  it('development/test or CI only - pass - test', async () => {
    testingOnly(mockRequest, mockResponse, mockNext);
    expect(statusCode).not.toBe(403);
  });
  it('development/test or CI only - pass - development', async () => {
    const currentEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    testingOnly(mockRequest, mockResponse, mockNext);
    expect(statusCode).not.toBe(403);
    process.env.NODE_ENV = currentEnv;
  });
  it('development/test or CI only - pass - CI', async () => {
    let clearEnv;
    if (!process.env.CIRCLECI_AUTH_TOKEN) {
      clearEnv = true;
      process.env.CIRCLECI_AUTH_TOKEN = 'development';
    }
    testingOnly(mockRequest, mockResponse, mockNext);
    expect(statusCode).not.toBe(403);

    if (clearEnv) {
      delete process.env.CIRCLECI_AUTH_TOKEN;
    }
  });
  it('development/test or CI only - fail - production', async () => {
    const currentEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    testingOnly(mockRequest, mockResponse, mockNext);
    expect(statusCode).toBe(403);
    process.env.NODE_ENV = currentEnv;
  });
});
