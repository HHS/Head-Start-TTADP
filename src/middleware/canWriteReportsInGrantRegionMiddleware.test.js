import canWriteReportsInGrantRegionMiddleware from './canWriteReportsInGrantRegionMiddleware'
import { auditLogger } from '../logger'
import { currentUserId } from '../services/currentUser'
import { Grant } from '../models'
import ActivityReportPolicy from '../policies/activityReport'
import { userById } from '../services/users'

jest.mock('../logger')
jest.mock('../services/currentUser')
jest.mock('../models')
jest.mock('../policies/activityReport')
jest.mock('../services/users')

describe('canWriteReportsInGrantRegionMiddleware', () => {
  let req
  let res
  let next

  beforeEach(() => {
    req = {
      params: {
        grantId: 1,
      },
    }
    res = {
      sendStatus: jest.fn(),
    }
    next = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should call next if user can write reports in grant region', async () => {
    currentUserId.mockResolvedValue(1)
    userById.mockResolvedValue({ id: 1 })
    Grant.findOne.mockResolvedValue({ id: 1, regionId: 1 })
    ActivityReportPolicy.mockImplementation(() => ({
      canWriteInRegion: () => true,
    }))

    await canWriteReportsInGrantRegionMiddleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.sendStatus).not.toHaveBeenCalled()
  })

  it('should send 403 if grant is not found', async () => {
    currentUserId.mockResolvedValue(1)
    userById.mockResolvedValue({ id: 1 })
    Grant.findOne.mockResolvedValue(null)

    await canWriteReportsInGrantRegionMiddleware(req, res, next)

    expect(res.sendStatus).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
    expect(auditLogger.warn).toHaveBeenCalledWith('User 1 denied access due to invalid grant param')
  })

  it('should send 403 if user cannot write reports in grant region', async () => {
    currentUserId.mockResolvedValue(1)
    userById.mockResolvedValue({ id: 1 })
    Grant.findOne.mockResolvedValue({ id: 1, regionId: 1 })
    ActivityReportPolicy.mockImplementation(() => ({
      canWriteInRegion: () => false,
    }))

    await canWriteReportsInGrantRegionMiddleware(req, res, next)

    expect(res.sendStatus).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
    expect(auditLogger.warn).toHaveBeenCalledWith('User 1 denied access to grant 1')
  })
})
