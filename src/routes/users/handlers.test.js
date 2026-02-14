import {
  getPossibleCollaborators,
  getPossibleStateCodes,
  requestVerificationEmail,
  verifyEmailToken,
  getActiveUsers,
  setFeatureFlag,
  getFeatureFlags,
  getTrainingReportUsers,
  getTrainingReportTrainersByRegion,
  getTrainingReportTrainersByRegionAndNationalCenter,
  getTrainingReportNationalCenterUsers,
  getNamesByIds,
} from './handlers'
import {
  userById,
  usersWithPermissions,
  setFlag,
  getTrainingReportUsersByRegion,
  getUserNamesByIds,
  usersByRoles,
} from '../../services/users'
import User from '../../policies/user'
import db, { Grant } from '../../models'
import { createAndStoreVerificationToken, validateVerificationToken } from '../../services/token'
import { currentUserId } from '../../services/currentUser'
import SCOPES from '../../middleware/scopeConstants'
import { FEATURE_FLAGS } from '../../constants'
import activeUsers from '../../services/activeUsers'

jest.mock('../../services/activeUsers')
jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
  statisticsByUser: jest.fn(),
  setFlag: jest.fn(),
  getTrainingReportUsersByRegion: jest.fn(),
  getUserNamesByIds: jest.fn(),
  usersByRoles: jest.fn(),
}))

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}))

jest.mock('../../lib/mailer', () => ({
  sendEmailVerificationRequestWithToken: jest.fn(),
}))

jest.mock('../../services/token', () => ({
  createAndStoreVerificationToken: jest.fn(),
  validateVerificationToken: jest.fn(),
}))

const originalIsAdmin = User.prototype.isAdmin

const mockResponse = {
  json: jest.fn(),
  writeHead: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
  on: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  error: jest.fn(),
}

const mockRequest = {
  session: {
    userId: 1,
  },
}

const originalIgnoreCache = process.env.IGNORE_CACHE

describe('User handlers', () => {
  beforeAll(() => {
    process.env.IGNORE_CACHE = true
  })
  afterAll(() => {
    process.env.IGNORE_CACHE = originalIgnoreCache
    db.sequelize.close()
  })
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getPossibleStateCodes', () => {
    it('returns state codes', async () => {
      const response = ['NM', 'NV', 'AZ', 'OK', 'MN']
      Grant.findAll = jest.fn()
      Grant.findAll.mockResolvedValue([
        { stateCode: 'NM' },
        { stateCode: 'NV' },
        { stateCode: 'AZ' },
        { stateCode: 'OK' },
        { stateCode: 'MN' },
      ])
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 1,
          },
          {
            regionId: 2,
          },
        ],
      })
      await getPossibleStateCodes(mockRequest, mockResponse)
      expect(mockResponse.json).toHaveBeenCalledWith(response)
    })

    it('handles errors', async () => {
      Grant.findAll = jest.fn()
      Grant.findAll.mockResolvedValue([
        { stateCode: 'NM' },
        { stateCode: 'NV' },
        { stateCode: 'AZ' },
        { stateCode: 'OK' },
        { stateCode: 'MN' },
      ])
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 1,
          },
          {
            regionId: 2,
          },
        ],
      })
      const end = jest.fn()
      const status = jest.fn(() => ({ end }))
      await getPossibleStateCodes({}, { status })
      expect(status).toHaveBeenCalledWith(500)
    })
  })

  describe('getPossibleCollaborators', () => {
    const request = {
      ...mockRequest,
      query: { region: 1 },
      body: { resourcesUsed: 'test' },
    }

    it('returns users', async () => {
      const response = [{ name: 'name', id: 1 }]
      User.prototype.canViewUsersInRegion = jest.fn().mockReturnValue(true)
      usersWithPermissions.mockResolvedValue(response)
      userById.mockResolvedValue({
        id: 1,
      })
      await getPossibleCollaborators(request, mockResponse)
      expect(mockResponse.json).toHaveBeenCalledWith(response)
    })

    it('handles unauthorized requests', async () => {
      User.prototype.canViewUsersInRegion = jest.fn().mockReturnValue(false)
      userById.mockResolvedValue({
        id: 1,
      })
      await getPossibleCollaborators(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403)
    })

    it('handles errors', async () => {
      const response = [{ name: 'name', id: 1 }]
      User.prototype.canViewUsersInRegion = jest.fn().mockReturnValue(true)
      usersWithPermissions.mockResolvedValue(response)
      userById.mockResolvedValue({
        id: 1,
      })
      await getPossibleCollaborators({}, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })
  })

  describe('requestVerificationEmail', () => {
    const request = {
      ...mockRequest,
      body: { email: '' },
    }

    it('returns 200', async () => {
      currentUserId.mockResolvedValueOnce(1)
      userById.mockResolvedValueOnce({
        id: 1,
        email: 'whatever',
      })
      createAndStoreVerificationToken.mockResolvedValue('token')
      await requestVerificationEmail(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(200)
    })

    it('handles errors', async () => {
      currentUserId.mockResolvedValueOnce(1)
      userById.mockResolvedValueOnce({
        id: 1,
        email: 'whatever',
      })
      createAndStoreVerificationToken.mockRejectedValueOnce(new Error('Problem creating token'))
      await requestVerificationEmail({}, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })
  })
  describe('verifyEmailToken', () => {
    it('handles success', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      }
      validateVerificationToken.mockResolvedValueOnce({
        userId: 1,
      })
      currentUserId.mockResolvedValueOnce(1)
      await verifyEmailToken(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(200)
    })

    it('handles a missing token in the request params', async () => {
      const request = {
        ...mockRequest,
        params: {},
      }
      currentUserId.mockResolvedValueOnce(1)
      await verifyEmailToken(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400)
    })

    it('handles a missing user id', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      }

      currentUserId.mockResolvedValueOnce(null)
      await verifyEmailToken(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400)
    })

    it('handles no error returned from the token service', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      }

      currentUserId.mockResolvedValueOnce(1)
      validateVerificationToken.mockResolvedValueOnce(null)
      await verifyEmailToken(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403)
    })

    it('handles errors', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      }

      currentUserId.mockResolvedValueOnce(1)
      validateVerificationToken.mockRejectedValueOnce(new Error('Problem validating token'))
      await verifyEmailToken(request, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })
  })

  describe('activeUsers', () => {
    it('handles retrieving active users', async () => {
      const request = {
        ...mockRequest,
      }
      const stream = {
        on: jest.fn((e, cb) => cb()),
        pipe: jest.fn(),
      }
      activeUsers.mockResolvedValue(stream)
      userById.mockResolvedValue({ id: 1, name: 'user' })
      User.prototype.isAdmin = jest.fn().mockReturnValue(true)
      await getActiveUsers(request, mockResponse)
      expect(stream.pipe).toHaveBeenCalledWith(mockResponse)
      expect(mockResponse.writeHead).toHaveBeenCalled()
      expect(mockResponse.error).not.toHaveBeenCalled()
    })

    it('does not allow unauthorized requests', async () => {
      const request = {
        ...mockRequest,
      }
      User.prototype.isAdmin = jest.fn().mockReturnValue(false)
      userById.mockResolvedValue({
        id: 1,
      })
      await getActiveUsers(request, mockResponse)
      expect(mockResponse.on).not.toHaveBeenCalled()
      expect(mockResponse.writeHead).not.toHaveBeenCalled()
    })

    it('calls the error handler on error', async () => {
      const request = {
        ...mockRequest,
      }
      User.prototype.isAdmin = jest.fn().mockReturnValue(false)
      userById.mockResolvedValue(null)
      await getActiveUsers(request, mockResponse)
      expect(mockResponse.on).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })
  })

  describe('setFeatureFlag', () => {
    const request = {
      ...mockRequest,
      body: {
        flag: 'anv_statistics',
        on: false,
      },
    }
    it('handles setting a flag for all users', async () => {
      const response = [[], 15]
      setFlag.mockResolvedValue(response)
      User.prototype.isAdmin = jest.fn().mockReturnValue(true)
      await setFeatureFlag(request, mockResponse)
      expect(mockResponse.json).toHaveBeenCalledWith(response)
      expect(mockResponse.error).not.toHaveBeenCalled()
    })

    it('does not allow unauthorized requests', async () => {
      User.prototype.isAdmin = jest.fn().mockReturnValue(false)
      userById.mockResolvedValue({
        id: 1,
      })
      await setFeatureFlag(request, mockResponse)
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403)
    })

    it('calls the error handler on error', async () => {
      User.prototype.isAdmin = jest.fn().mockReturnValue(false)
      userById.mockResolvedValue(null)
      await setFeatureFlag(request, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })
  })

  describe('isAdmin', () => {
    it('works predictably (no prototype override)', async () => {
      User.prototype.isAdmin = originalIsAdmin
      const user = {
        id: 1,
        flags: ['feature1'],
        permissions: [{ scopeId: SCOPES.ADMIN }],
      }
      const policy = new User(user)
      expect(policy.isAdmin()).toBe(true)
    })
  })

  describe('getFeatureFlags', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('returns all feature flags for admin users', async () => {
      const user = {
        id: 1,
        flags: ['feature1'],
        permissions: [{ scopeId: SCOPES.ADMIN }],
      }
      User.prototype.isAdmin = jest.fn().mockReturnValue(true)
      userById.mockResolvedValue(user)
      currentUserId.mockResolvedValue(1)

      await getFeatureFlags(mockRequest, mockResponse)
      expect(mockResponse.json).toHaveBeenCalledWith(FEATURE_FLAGS)
    })

    it('returns user-specific feature flags for non-admin users', async () => {
      const user = {
        id: 1,
        flags: ['feature1'],
        permissions: [],
      }
      User.prototype.isAdmin = jest.fn().mockReturnValue(false)
      userById.mockResolvedValue(user)
      currentUserId.mockResolvedValue(1)

      await getFeatureFlags(mockRequest, mockResponse)
      expect(mockResponse.json).toHaveBeenCalledWith(user.flags)
    })

    it('handles errors', async () => {
      const error = new Error('An error occurred')
      userById.mockRejectedValue(error)
      currentUserId.mockResolvedValue(1)

      await getFeatureFlags(mockRequest, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getTrainingReportUsers', () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
        },
      ],
      lastLogin: new Date(),
    }

    const req = {
      query: {
        regionId: '1',
        eventId: '1',
      },
    }

    const res = {
      sendStatus: jest.fn(),
      json: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return 403 if user does not have write permission in region', async () => {
      const unauthorizedReq = {
        ...req,
        query: {
          regionId: '4',
        },
      }
      userById.mockResolvedValueOnce(mockUser)
      currentUserId.mockResolvedValueOnce(1)
      getTrainingReportUsersByRegion.mockResolvedValueOnce([])

      await getTrainingReportUsers(unauthorizedReq, res)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(res.sendStatus).toHaveBeenCalledTimes(1)
      expect(res.sendStatus).toHaveBeenCalledWith(403)
      expect(getTrainingReportUsersByRegion).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should return a list of users with training reports by region', async () => {
      userById.mockResolvedValueOnce(mockUser)
      currentUserId.mockResolvedValueOnce(1)
      getTrainingReportUsersByRegion.mockResolvedValueOnce([])

      await getTrainingReportUsers(req, res)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(getTrainingReportUsersByRegion).toHaveBeenCalledWith(1, 1)
      expect(res.json).toHaveBeenCalledWith([])
    })
    it('should handle errors', async () => {
      const error = new Error('An error occurred')

      currentUserId.mockResolvedValueOnce(1)
      getTrainingReportUsersByRegion.mockResolvedValueOnce([])
      userById.mockRejectedValueOnce(error)

      await getTrainingReportUsers(req, res)

      expect(userById).toHaveBeenCalledTimes(1)
      expect(getTrainingReportUsersByRegion).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getNamesByIds', () => {
    const res = {
      sendStatus: jest.fn(),
      json: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return 400 if the request has no ids', async () => {
      await getNamesByIds({ query: {} }, res)
      expect(res.sendStatus).toHaveBeenCalledWith(400)
    })

    it('should return a list of users with training reports by region', async () => {
      getUserNamesByIds.mockResolvedValueOnce(['TIM', 'TOM'])
      await getNamesByIds({ query: { ids: [1, 2] } }, res)
      expect(res.json).toHaveBeenCalledWith(['TIM', 'TOM'])
    })

    it('should handle errors', async () => {
      const error = new Error('An error occurred')
      const handleErrors = jest.fn()
      getUserNamesByIds.mockRejectedValueOnce(error)
      handleErrors.mockResolvedValueOnce()
      await getNamesByIds({ query: { ids: [1, 2] } }, res)
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getTrainingReportTrainersByRegion', () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
        },
      ],
      lastLogin: new Date(),
    }

    const mockUserWithoutTRPermissions = {
      id: '2',
      name: 'Jane Doe',
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPES.SITE_ACCESS,
        },
      ],
      lastLogin: new Date(),
    }

    const req = {
      params: {
        regionId: '1',
      },
    }

    const res = {
      sendStatus: jest.fn(),
      json: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return 403 if user does not have permission in region', async () => {
      const unauthorizedReq = {
        ...req,
        params: {
          regionId: '4',
        },
      }
      userById.mockResolvedValueOnce(mockUserWithoutTRPermissions)
      currentUserId.mockResolvedValueOnce(1)

      // Create a local res object for this specific test case.
      const localRes = {
        sendStatus: jest.fn(),
        json: jest.fn(),
        status: jest.fn(() => ({ end: jest.fn() })),
        headersSent: false,
      }

      // Simulate that headers are sent after the first call to sendStatus.
      localRes.sendStatus.mockImplementationOnce((code) => {
        localRes.headersSent = true
        return localRes
      })

      await getTrainingReportTrainersByRegion(unauthorizedReq, localRes)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(localRes.sendStatus).toHaveBeenCalledTimes(1)
      expect(localRes.sendStatus).toHaveBeenCalledWith(403)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(localRes.json).not.toHaveBeenCalled()
    })

    it('should return 403 if user requests a region they do not have permission for', async () => {
      const unauthorizedRegionReq = {
        params: { regionId: '4' }, // User only has permission for region 1
      }
      userById.mockResolvedValueOnce(mockUser) // Has TR permission for region 1 only
      currentUserId.mockResolvedValueOnce(1)

      await getTrainingReportTrainersByRegion(unauthorizedRegionReq, res)

      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(res.sendStatus).toHaveBeenCalledWith(403)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should return a list of trainers by region with correct roles', async () => {
      const mockRegionalTrainers = [
        { id: 1, name: 'Trainer 1', email: 'trainer1@test.gov' },
        { id: 2, name: 'Trainer 2', email: 'trainer2@test.gov' },
      ]

      userById.mockResolvedValueOnce(mockUser)
      currentUserId.mockResolvedValueOnce(1)
      usersByRoles.mockResolvedValueOnce(mockRegionalTrainers)

      await getTrainingReportTrainersByRegion(req, res)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(usersByRoles).toHaveBeenNthCalledWith(
        1,
        ['HS', 'SS', 'ECS', 'GS', 'FES', 'TTAC', 'ECM', 'GSM', 'AA'],
        1
      )
      expect(res.json).toHaveBeenCalledWith([...mockRegionalTrainers])
    })

    it('should handle errors', async () => {
      const error = new Error('An error occurred')
      currentUserId.mockResolvedValueOnce(1)
      userById.mockRejectedValueOnce(error)

      await getTrainingReportTrainersByRegion(req, res)

      expect(userById).toHaveBeenCalledTimes(1)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getTrainingReportTrainersByRegionAndNationalCenter', () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
        },
      ],
      lastLogin: new Date(),
    }

    const mockUserWithoutTRPermissions = {
      id: '2',
      name: 'Jane Doe',
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPES.SITE_ACCESS,
        },
      ],
      lastLogin: new Date(),
    }

    const req = {
      params: {
        regionId: '1',
      },
    }

    const res = {
      sendStatus: jest.fn(),
      json: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return 403 if user does not have permission in region', async () => {
      const unauthorizedReq = {
        ...req,
        params: {
          regionId: '4',
        },
      }
      userById.mockResolvedValueOnce(mockUserWithoutTRPermissions)
      currentUserId.mockResolvedValueOnce(1)

      // Create a local res object for this specific test case.
      const localRes = {
        sendStatus: jest.fn(),
        json: jest.fn(),
        status: jest.fn(() => ({ end: jest.fn() })),
        headersSent: false,
      }

      // Simulate that headers are sent after the first call to sendStatus.
      localRes.sendStatus.mockImplementationOnce((code) => {
        localRes.headersSent = true
        return localRes
      })

      await getTrainingReportTrainersByRegionAndNationalCenter(unauthorizedReq, localRes)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(localRes.sendStatus).toHaveBeenCalledTimes(1)
      expect(localRes.sendStatus).toHaveBeenCalledWith(403)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(localRes.json).not.toHaveBeenCalled()
    })

    it('should return a list of trainers by region with correct roles', async () => {
      const mockRegionalTrainers = [
        { id: 1, name: 'Trainer 1', email: 'trainer1@test.gov' },
        { id: 2, name: 'Trainer 2', email: 'trainer2@test.gov' },
      ]
      const mockNCTrainers = [{ id: 3, name: 'NC User 1', email: 'nc1@test.gov' }]
      userById.mockResolvedValueOnce(mockUser)
      currentUserId.mockResolvedValueOnce(1)
      usersByRoles.mockResolvedValueOnce(mockRegionalTrainers)
      usersByRoles.mockResolvedValueOnce(mockNCTrainers)

      await getTrainingReportTrainersByRegionAndNationalCenter(req, res)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(usersByRoles).toHaveBeenNthCalledWith(
        1,
        ['HS', 'SS', 'ECS', 'GS', 'FES', 'TTAC', 'ECM', 'GSM', 'AA'],
        [1]
      )
      expect(usersByRoles).toHaveBeenNthCalledWith(2, ['NC'])
      expect(res.json).toHaveBeenCalledWith([...mockRegionalTrainers, ...mockNCTrainers])
    })

    it('should handle errors', async () => {
      const error = new Error('An error occurred')
      currentUserId.mockResolvedValueOnce(1)
      userById.mockRejectedValueOnce(error)

      await getTrainingReportTrainersByRegionAndNationalCenter(req, res)

      expect(userById).toHaveBeenCalledTimes(1)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getTrainingReportNationalCenterUsers', () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
        },
      ],
      lastLogin: new Date(),
    }

    const req = {
      params: {
        regionId: '1',
      },
    }

    const res = {
      sendStatus: jest.fn(),
      json: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    }

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should return 403 if user does not have permission in region', async () => {
      const unauthorizedUser = {
        id: '1',
        name: 'John Doe',
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
        lastLogin: new Date(),
      }

      userById.mockResolvedValueOnce(unauthorizedUser)
      currentUserId.mockResolvedValueOnce(1)

      const resWithHeadersSent = {
        sendStatus: jest.fn(),
        json: jest.fn(),
        status: jest.fn(() => ({
          end: jest.fn(),
        })),
        headersSent: true,
      }

      await getTrainingReportNationalCenterUsers(req, resWithHeadersSent)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(resWithHeadersSent.sendStatus).toHaveBeenCalledTimes(1)
      expect(resWithHeadersSent.sendStatus).toHaveBeenCalledWith(403)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('should return a list of national center users without region filter', async () => {
      const mockNCUsers = [
        { id: 1, name: 'NC User 1', email: 'nc1@test.gov' },
        { id: 2, name: 'NC User 2', email: 'nc2@test.gov' },
      ]

      userById.mockResolvedValueOnce(mockUser)
      currentUserId.mockResolvedValueOnce(1)
      usersByRoles.mockResolvedValueOnce(mockNCUsers)

      await getTrainingReportNationalCenterUsers(req, res)
      expect(userById).toHaveBeenCalledTimes(1)
      expect(currentUserId).toHaveBeenCalledTimes(1)
      expect(usersByRoles).toHaveBeenCalledWith(['NC'])
      expect(res.json).toHaveBeenCalledWith(mockNCUsers)
    })

    it('should handle errors', async () => {
      const error = new Error('An error occurred')
      currentUserId.mockResolvedValueOnce(1)
      userById.mockRejectedValueOnce(error)

      await getTrainingReportNationalCenterUsers(req, res)

      expect(userById).toHaveBeenCalledTimes(1)
      expect(usersByRoles).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })
})
