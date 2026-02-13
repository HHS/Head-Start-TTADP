import httpCodes from 'http-codes'
import { updateStatus } from './handlers'
import { userById } from '../../services/users'
import { updateObjectiveStatusByIds, getObjectiveRegionAndGoalStatusByIds } from '../../services/objectives'
import { sequelize } from '../../models'
import SCOPES from '../../middleware/scopeConstants'
import { OBJECTIVE_STATUS } from '../../constants'

jest.mock('../../services/objectives', () => ({
  ...jest.requireActual('../../services/objectives'),
  updateObjectiveStatusByIds: jest.fn(),
  getObjectiveRegionAndGoalStatusByIds: jest.fn(),
}))

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}))

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}))

describe('objectives handlers', () => {
  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json: jest.fn(),
    })),
  }

  const mockRequest = {
    session: {
      userId: 1,
    },
  }

  describe('updateStatus', () => {
    afterAll(() => sequelize.close())
    afterEach(() => {
      jest.clearAllMocks()
    })
    it('returns an error if user does not have regional permissions', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1
      const objectiveIds = [1, 2, 3]
      const status = OBJECTIVE_STATUS.COMPLETE

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: objectiveIds,
          status,
          regionId,
        },
      }

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN)
    })

    it('returns an error if IDS are missing from the body', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1
      const status = OBJECTIVE_STATUS.COMPLETE

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          status,
          regionId,
        },
      }

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
    })

    it('returns an error if status is missing from the body', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
        },
      }

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
    })

    it('returns an error if the provided objectives span 2 regions', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.COMPLETE,
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          goal: {
            grant: {
              regionId: 2,
            },
          },
        },
        {
          goal: {
            grant: {
              regionId: 2,
            },
          },
        },
        {
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
    })

    it('returns an error if the provided objectives do not match the provided region', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.COMPLETE,
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          goal: {
            grant: {
              regionId: 2,
            },
          },
        },
        {
          goal: {
            grant: {
              regionId: 2,
            },
          },
        },
        {
          goal: {
            grant: {
              regionId: 2,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
    })

    it('returns an error if the status transition is invalid', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.NOT_STARTED,
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST)
    })

    it('successfully updates status for a user with regional permissions', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK)
    })

    it('successfully updates status for a user with admin permissions', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.ADMIN,
            regionId: 14,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])
      await updateStatus(request, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK)
    })

    it('handles failures', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.ADMIN,
            regionId: 14,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          status: OBJECTIVE_STATUS.COMPLETE,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])
      updateObjectiveStatusByIds.mockRejectedValue(new Error('Failed to update status'))
      await updateStatus(request, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR)
    })

    it('correctly sets overrideStatus for Not Started to complete', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.COMPLETE,
          closeSuspendReason: 'Test reason',
          closeSuspendContext: 'Test context',
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          id: 1,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 2,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 3,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(updateObjectiveStatusByIds).toHaveBeenCalledWith([1, 2, 3], OBJECTIVE_STATUS.IN_PROGRESS, 'Test reason', 'Test context')
    })

    it('correctly sets overrideStatus for In Progress to Not Started', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          closeSuspendReason: 'Test reason',
          closeSuspendContext: 'Test context',
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          id: 1,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 2,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 3,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(updateObjectiveStatusByIds).toHaveBeenCalledWith([1, 2, 3], OBJECTIVE_STATUS.IN_PROGRESS, 'Test reason', 'Test context')
    })

    it('correctly sets overrideStatus for suspended to not started', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          closeSuspendReason: 'Test reason',
          closeSuspendContext: 'Test context',
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          id: 1,
          status: OBJECTIVE_STATUS.SUSPENDED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 2,
          status: OBJECTIVE_STATUS.SUSPENDED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 3,
          status: OBJECTIVE_STATUS.SUSPENDED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(updateObjectiveStatusByIds).toHaveBeenCalledWith([1, 2, 3], OBJECTIVE_STATUS.SUSPENDED, 'Test reason', 'Test context')
    })

    it('correctly sets overrideStatus for a variety of statuses', async () => {
      const user = {
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      }

      const regionId = 1

      userById.mockResolvedValue(user)

      const request = {
        ...mockRequest,
        body: {
          ids: [1, 2, 3],
          regionId,
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          closeSuspendReason: 'Test reason',
          closeSuspendContext: 'Test context',
        },
      }

      getObjectiveRegionAndGoalStatusByIds.mockResolvedValue([
        {
          id: 1,
          status: OBJECTIVE_STATUS.COMPLETE,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
        {
          id: 2,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
          goal: {
            grant: {
              regionId: 1,
            },
          },
        },
      ])

      await updateStatus(request, mockResponse)

      expect(updateObjectiveStatusByIds).toHaveBeenCalledWith([1, 2], OBJECTIVE_STATUS.IN_PROGRESS, 'Test reason', 'Test context')
    })
  })
})
