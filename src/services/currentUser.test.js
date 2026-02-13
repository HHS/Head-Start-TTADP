import {} from 'dotenv/config'
import httpCodes from 'http-codes'

import httpContext from 'express-http-context'
import { retrieveUserDetails, currentUserId } from './currentUser'
import findOrCreateUser from './findOrCreateUser'
import { auditLogger } from '../logger'
import { validateUserAuthForAdmin } from './accessValidation'

jest.mock('axios')
jest.mock('./findOrCreateUser')
jest.mock('./accessValidation', () => ({
  validateUserAuthForAdmin: jest.fn(),
}))
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
  },
  auditLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}))
jest.mock('express-http-context', () => ({
  set: jest.fn(),
}))
jest.mock('validator/lib/isEmail', () => jest.fn())

describe('currentUser', () => {
  beforeEach(async () => {
    jest.resetModules()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('currentUserId', () => {
    const mockSession = jest.fn()
    const mockLocals = jest.fn()

    test('can retrieve userId from the session', async () => {
      const mockRequest = { session: mockSession, headers: {} }
      const mockResponse = { locals: mockLocals }

      mockSession.userId = 5

      expect(await currentUserId(mockRequest, mockResponse)).toEqual(5)
    })

    test('can retrieve userId from the response locals', async () => {
      const mockRequest = { headers: {} }
      const mockResponse = { locals: mockLocals }

      mockLocals.userId = 10

      expect(await currentUserId(mockRequest, mockResponse)).toEqual(10)
    })

    test('bypasses auth and retrieves userId from environment variables when not in production and BYPASS_AUTH is true', async () => {
      process.env.NODE_ENV = 'development'
      process.env.BYPASS_AUTH = 'true'
      process.env.CURRENT_USER_ID = '999'

      const mockRequest = { session: {}, headers: {} }
      const mockResponse = {}

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toEqual(999)
      expect(mockRequest.session.userId).toEqual('999')
      expect(mockRequest.session.uuid).toBeDefined()
    })

    test('does not bypass auth and retrieves userId from environment variables when not in production and BYPASS_AUTH is false', async () => {
      process.env.NODE_ENV = 'development'
      process.env.BYPASS_AUTH = 'false'
      process.env.CURRENT_USER_ID = '999'

      const mockRequest = { session: {}, headers: {} }
      const mockResponse = {}

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toBeNull()
      expect(mockRequest.session.userId).not.toBeDefined()
      expect(mockRequest.session.uuid).not.toBeDefined()
    })

    test('does not set the session userId when not in production and BYPASS_AUTH is true', async () => {
      process.env.NODE_ENV = 'development'
      process.env.BYPASS_AUTH = 'true'
      process.env.CURRENT_USER_ID = '999'

      const mockRequest = { headers: {} }
      const mockResponse = {}

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toEqual(999)
      expect(mockRequest.session).toBeUndefined()
    })

    test('handles impersonation when Auth-Impersonation-Id header is set and user is not an admin', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(200) },
        session: {},
      }
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
      }
      mockResponse.locals.userId = 100 // Non-admin user

      validateUserAuthForAdmin.mockResolvedValueOnce(false) // Non-admin user cannot impersonate

      await currentUserId(mockRequest, mockResponse)

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.UNAUTHORIZED)
      expect(auditLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Impersonation failure. User (100) attempted to impersonate user (200), but the session user (100) is not an admin.')
      )
    })

    test('handles impersonation when Auth-Impersonation-Id header is set and impersonated user is an admin', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(300) },
        session: {},
      }
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
      }
      mockResponse.locals.userId = 100 // Admin user

      validateUserAuthForAdmin
        .mockResolvedValueOnce(true) // Current user is an admin
        .mockResolvedValueOnce(true) // Impersonated user is also an admin

      await currentUserId(mockRequest, mockResponse)

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.UNAUTHORIZED)
      expect(auditLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Impersonation failure. User (100) attempted to impersonate user (300), but the impersonated user is an admin.')
      )
    })

    test('allows impersonation when Auth-Impersonation-Id header is set and both users pass validation', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(200) },
        session: {},
      }
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: { userId: 100 },
      }

      validateUserAuthForAdmin
        .mockResolvedValueOnce(true) // Current user is an admin
        .mockResolvedValueOnce(false) // Impersonated user is not an admin

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toEqual(200)
      expect(mockResponse.sendStatus).not.toHaveBeenCalledWith(httpCodes.UNAUTHORIZED)
      expect(httpContext.set).toHaveBeenCalledWith('impersonationUserId', 200)
    })

    test('handles invalid JSON in Auth-Impersonation-Id header gracefully', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': '{invalidJson}' },
        session: {},
      }
      const mockResponse = {
        locals: {},
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      }

      await currentUserId(mockRequest, mockResponse)

      const expectedMessage = 'Could not parse the Auth-Impersonation-Id header'
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining(expectedMessage))
    })

    test('handles empty Auth-Impersonation-Id header gracefully', async () => {
      process.env.NODE_ENV = 'production'
      process.env.BYPASS_AUTH = 'false'
      const mockRequest = {
        headers: { 'auth-impersonation-id': '""' },
        session: {},
      }
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      }

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toBeNull()
      expect(auditLogger.error).not.toHaveBeenCalled()
      expect(httpContext.set).not.toHaveBeenCalled()
      expect(mockResponse.sendStatus).not.toHaveBeenCalled()
    })

    test('calls handleErrors if an error occurs during impersonation admin validation', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(155) },
        session: {},
      }
      const mockResponse = {
        locals: { userId: 100 },
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      }

      validateUserAuthForAdmin.mockImplementationOnce(() => {
        throw new Error('Admin validation failed')
      })

      await currentUserId(mockRequest, mockResponse)

      const expectedMessage = 'MIDDLEWARE:CURRENT USER - UNEXPECTED ERROR - Error: Admin validation failed'
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining(expectedMessage))
    })

    test('logs error and returns UNAUTHORIZED if userId is null', async () => {
      process.env.BYPASS_AUTH = 'false'
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(155) },
        session: null,
      }
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
      }

      await currentUserId(mockRequest, mockResponse)

      expect(auditLogger.error).toHaveBeenCalledWith('Impersonation failure. No valid user ID found in session or locals.')
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.UNAUTHORIZED)
    })

    test('bypasses authentication with playwright-user-id header in non-production environment', async () => {
      process.env.NODE_ENV = 'development'
      process.env.BYPASS_AUTH = 'true'
      const mockRequest = {
        headers: { 'playwright-user-id': '123' },
        session: {},
      }
      const mockResponse = {}

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toEqual(123)
      expect(mockRequest.session.userId).toEqual('123')
      expect(mockRequest.session.uuid).toBeDefined()
      expect(auditLogger.warn).toHaveBeenCalledWith('Bypassing authentication in authMiddleware. Using user id 123 from playwright-user-id header.')
    })

    test('does not set session if req.session is undefined', async () => {
      const mockRequest = {
        headers: { 'playwright-user-id': '123' },
        session: undefined,
      }
      const mockResponse = {}

      const userId = await currentUserId(mockRequest, mockResponse)

      expect(userId).toEqual(123)
      expect(mockRequest.session).toBeUndefined()
      expect(auditLogger.warn).toHaveBeenCalledWith('Bypassing authentication in authMiddleware. Using user id 123 from playwright-user-id header.')
    })
  })

  describe('retrieveUserDetails', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // Whatever retrieveUserDetails returns is whatever findOrCreateUser resolves to
      findOrCreateUser.mockResolvedValue({ id: 123, email: 'returned@example.com' })
    })

    test('maps all fields and builds full name from given_name + family_name', async () => {
      const data = {
        given_name: 'Joe',
        family_name: 'Smith',
        email: 'ada@example.com',
        sub: 987654321, // number to exercise .toString()
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        userId: 42, // number to exercise .toString()
      }

      const result = await retrieveUserDetails(data)

      expect(findOrCreateUser).toHaveBeenCalledWith({
        name: 'Joe Smith',
        email: 'ada@example.com',
        hsesUsername: '987654321',
        hsesAuthorities: ['ROLE_USER', 'ROLE_ADMIN'],
        hsesUserId: '42',
      })
      expect(result).toEqual({ id: 123, email: 'returned@example.com' })
    })

    test('handles missing given/family names', async () => {
      const data = {
        // no given_name/family_name
        email: 'no.name@example.com',
        sub: 'sub-abc',
        roles: [],
        userId: 'user-123',
      }

      await retrieveUserDetails(data)

      expect(findOrCreateUser).toHaveBeenCalledWith({
        name: null,
        email: 'no.name@example.com',
        hsesUsername: 'sub-abc',
        hsesAuthorities: [],
        hsesUserId: 'user-123',
      })
    })

    test('coerces optional values to null or empty array when absent', async () => {
      const data = {
        given_name: 'Jane',
        family_name: 'Doe',
        sub: 'jane.doe',
      }

      await retrieveUserDetails(data)

      expect(findOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: null,
          hsesUserId: null,
          hsesAuthorities: [],
          hsesUsername: 'jane.doe',
        })
      )
    })

    test('handles non-string email/sub/userId via toString()', async () => {
      const data = {
        given_name: 'Num',
        family_name: 'Ber',
        email: 1001, // -> '1001'
        sub: 2024, // -> '2024'
        roles: ['ROLE_FEDERAL'],
        userId: 7, // -> '7'
      }

      await retrieveUserDetails(data)

      expect(findOrCreateUser).toHaveBeenCalledWith({
        name: 'Num Ber',
        email: '1001',
        hsesUsername: '2024',
        hsesAuthorities: ['ROLE_FEDERAL'],
        hsesUserId: '7',
      })
    })

    test('does not create a user when HSES omits sub (hsesUsername)', async () => {
      const data = {
        given_name: 'Test',
        email: 'test@example.com',
        // sub missing
        roles: [],
      }

      await expect(retrieveUserDetails(data)).rejects.toThrow(/Missing required user info from HSES/i)

      expect(findOrCreateUser).not.toHaveBeenCalled()
    })
  })
})
