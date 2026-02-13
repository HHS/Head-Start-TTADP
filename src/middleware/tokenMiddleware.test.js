jest.mock('../logger', () => ({
  __esModule: true,
  auditLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))
jest.mock('../services/accessValidation', () => ({
  __esModule: true,
  validateUserAuthForAccess: jest.fn(),
}))
jest.mock('./authMiddleware', () => ({
  __esModule: true,
  getUserInfo: jest.fn().mockResolvedValue({
    sub: 'user-123',
    email: 'user@example.com',
  }),
}))
jest.mock('../services/currentUser', () => ({
  __esModule: true,
  currentUserId: jest.fn(),
  retrieveUserDetails: jest.fn(),
}))
jest.mock('../serializers/errorResponses', () => ({
  __esModule: true,
  unauthorized: jest.fn(),
}))
jest.mock('../lib/apiErrorHandler', () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
}))

/* eslint-disable global-require */
const tokenMiddleware = require('./tokenMiddleware').default || require('./tokenMiddleware')

const { auditLogger } = require('../logger')
const { validateUserAuthForAccess } = require('../services/accessValidation')
const { currentUserId, retrieveUserDetails } = require('../services/currentUser')
const { unauthorized } = require('../serializers/errorResponses')

describe('tokenMiddleware', () => {
  let req
  let res
  let next

  beforeEach(() => {
    jest.clearAllMocks()
    req = {
      headers: {},
      session: {},
      path: '/api/whatever',
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    }
    next = jest.fn()
    currentUserId.mockResolvedValue(undefined)
  })

  it('returns 401 for an unknown token', async () => {
    await tokenMiddleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    })
  })

  it('returns a 403 for a user missing SITE_ACCESS', async () => {
    req.headers.authorization = 'Bearer 1234'
    req.session = { accessToken: 't', claims: { sub: 's' } }
    retrieveUserDetails.mockResolvedValue({ id: 1 })
    validateUserAuthForAccess.mockResolvedValue(false)

    await tokenMiddleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(unauthorized).toHaveBeenCalledWith(res, 'User does not have appropriate permissions to view this resource')
  })

  it('allows a good user through', async () => {
    req.headers.authorization = 'Bearer 1234'
    req.session = { accessToken: 't', claims: { sub: 's' } }
    retrieveUserDetails.mockResolvedValue({ id: 1 })
    validateUserAuthForAccess.mockResolvedValue(true)

    await tokenMiddleware(req, res, next)

    expect(res.locals.userId).toBe(1)
    expect(next).toHaveBeenCalled()
    expect(auditLogger.info).toHaveBeenCalledWith('User 1 making API request')
  })

  it('catches other errors', async () => {
    req.headers.authorization = 'Bearer 1234'

    req.session = { userId: 42, accessToken: 't', claims: { sub: 's' } }

    // Force an unexpected error from the downstream call
    retrieveUserDetails.mockRejectedValue(new Error('test error'))

    await tokenMiddleware(req, res, next)

    expect(auditLogger.error).toHaveBeenCalledWith('Error when retrieving user details from HSES: Error: test error')
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        // status: expect.stringMatching(/^500$/),
        status: '401',
        title: 'Unauthenticated User',
        detail: expect.any(String),
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('401  warns when Authorization is present but accessToken is missing', async () => {
    req.headers.authorization = 'Bearer 1234'
    req.session = { claims: { sub: 's' } } // missing accessToken

    await tokenMiddleware(req, res, next)

    expect(auditLogger.warn).toHaveBeenCalledWith('MIDDLEWARE:TOKEN missing session tokens for HSES lookup')
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    })
  })

  it('401  warns when Authorization is present but sub is missing', async () => {
    req.headers.authorization = 'Bearer 1234'
    req.session = { accessToken: 't', claims: {} } // missing sub

    await tokenMiddleware(req, res, next)

    expect(auditLogger.warn).toHaveBeenCalledWith('MIDDLEWARE:TOKEN missing session tokens for HSES lookup')
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    })
  })
  it('handles errors from validateUserAuthForAccess (second try/catch)', async () => {
    req.headers.authorization = 'Bearer 1234'
    req.session = { accessToken: 't', claims: { sub: 's' } }
    retrieveUserDetails.mockResolvedValue({ id: 1 })

    validateUserAuthForAccess.mockRejectedValue(new Error('db down'))

    const handleErrors = require('../lib/apiErrorHandler').default

    await tokenMiddleware(req, res, next)

    expect(handleErrors).toHaveBeenCalledWith(req, res, expect.any(Error), 'MIDDLEWARE:TOKEN')
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unrecoverable error in tokenMiddleware: Error: db down'))

    expect(next).not.toHaveBeenCalled()
    expect(res.locals.userId).toBeUndefined()
  })
})
