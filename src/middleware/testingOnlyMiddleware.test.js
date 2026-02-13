import { testingOnly } from './testingOnlyMiddleware'

describe('testingOnly', () => {
  let statusCode
  let message
  const mockRequest = {}
  const mockResponse = {
    status: jest.fn((num) => ({
      send: jest.fn((msg) => {
        statusCode = num
        message = msg
      }),
    })),
  }
  const mockNext = () => {}
  afterEach(() => {
    statusCode = undefined
    message = undefined
  })
  it('development/test or CI only - pass - test', async () => {
    testingOnly(mockRequest, mockResponse, mockNext)
    expect(statusCode).not.toBe(403)
  })
  it('development/test or CI only - pass - development', async () => {
    const currentEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    testingOnly(mockRequest, mockResponse, mockNext)
    expect(statusCode).not.toBe(403)
    process.env.NODE_ENV = currentEnv
  })
  it('development/test or CI only - pass - CI', async () => {
    const currentEnvNode = process.env.NODE_ENV
    let clearEnv
    if (!process.env.CI) {
      clearEnv = true
      process.env.CI = 'development'
    }
    process.env.NODE_ENV = 'production'

    testingOnly(mockRequest, mockResponse, mockNext)
    expect(statusCode).not.toBe(403)

    process.env.NODE_ENV = currentEnvNode
    if (clearEnv) {
      delete process.env.CI
    }
  })
  it('development/test or CI only - fail - production', async () => {
    const currentEnvNode = process.env.NODE_ENV
    let currentEnvCI
    if (process.env.CI) {
      currentEnvCI = process.env.CI
      delete process.env.CI
    }
    process.env.NODE_ENV = 'production'
    testingOnly(mockRequest, mockResponse, mockNext)
    expect(statusCode).toBe(403)
    process.env.NODE_ENV = currentEnvNode
    if (currentEnvCI) {
      process.env.CI = currentEnvCI
    }
  })
})
