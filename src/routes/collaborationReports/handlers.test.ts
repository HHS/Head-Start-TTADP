import type { Request, Response } from 'express'
import { REPORT_STATUSES } from '@ttahub/common'
import {
  getReports,
  getReport,
  submitReport,
  reviewReport,
  softDeleteReport,
  saveReport,
  createReport,
  getAlerts,
  downloadReports,
  sendCollabReportCSV,
} from './handlers'
import * as CRServices from '../../services/collabReports'
import { currentUserId } from '../../services/currentUser'
import { userById } from '../../services/users'
import { setReadRegions } from '../../services/accessValidation'
import handleErrors from '../../lib/apiErrorHandler'
import CollabReportPolicy from '../../policies/collabReport'
import { upsertApprover } from '../../services/collabReportApprovers'
import { collabReportToCsvRecord } from '../../lib/transform'
import SCOPES from '../../middleware/scopeConstants'
import db from '../../models'

jest.mock('../../services/collabReports')
jest.mock('../../lib/mailer')
jest.mock('../../services/currentUser')
jest.mock('../../services/users')
jest.mock('../../services/accessValidation')
jest.mock('../../lib/apiErrorHandler')
jest.mock('../../policies/collabReport')
jest.mock('../../services/collabReportApprovers')
jest.mock('../../services/userSettings')
jest.mock('../../policies/activityReport')
jest.mock('../../lib/transform')
jest.mock('../../models', () => ({
  CollabReportApprover: {
    update: jest.fn(),
  },
}))

describe('Collaboration Reports Handlers', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockJson: jest.Mock
  let mockSendStatus: jest.Mock
  let mockSend: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockSendStatus = jest.fn()
    mockSend = jest.fn()

    mockRequest = {}
    mockResponse = {
      json: mockJson,
      sendStatus: mockSendStatus,
      send: mockSend,
    }

    jest.clearAllMocks()
    ;(db.CollabReportApprover.update as jest.Mock).mockResolvedValue(undefined)
  })

  describe('getReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' }
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(userById as jest.Mock).mockResolvedValue({
        id: 123,
        name: 'Test User',
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      })
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canGet: jest.fn().mockReturnValue(true),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )
    })

    it('should return HTTP 200 and payload when report is found by ID', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        dataValues: { id: '1', name: 'Report 1' },
        toJSON: () => ({ id: '1', name: 'Report 1', displayId: 'COLLAB-001' }),
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)

      await getReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockJson).toHaveBeenCalledWith({ id: '1', name: 'Report 1', displayId: 'COLLAB-001' })
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should return HTTP 404 when report with specified ID is not found', async () => {
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await getReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
      expect(currentUserId).not.toHaveBeenCalled()
    })

    it('should return HTTP 403 when user is not authorized', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        dataValues: { id: '1', name: 'Report 1' },
        displayId: 'COLLAB-001',
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canGet: jest.fn().mockReturnValue(false),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )

      await getReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(403)
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should return HTTP 404 when service returns null', async () => {
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await getReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle missing request params gracefully', async () => {
      mockRequest.params = {}
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await getReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith(undefined)
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
    })
  })

  describe('getReports', () => {
    beforeEach(() => {
      mockRequest.query = {}
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(setReadRegions as jest.Mock).mockResolvedValue({})
    })

    it('should return payload when reports are found', async () => {
      const mockReports = {
        count: 2,
        rows: [
          { id: '1', name: 'Report 1' },
          { id: '2', name: 'Report 2' },
        ],
      }

      ;(CRServices.getReports as jest.Mock).mockResolvedValue(mockReports)
      await getReports(mockRequest as Request, mockResponse as Response)

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(setReadRegions).toHaveBeenCalledWith({}, 123)
      expect(CRServices.getReports).toHaveBeenCalledWith({})
      expect(mockJson).toHaveBeenCalledWith(mockReports)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should return empty results when no reports are found', async () => {
      const mockReports = {
        count: 0,
        rows: [],
      }

      ;(CRServices.getReports as jest.Mock).mockResolvedValue(mockReports)
      await getReports(mockRequest as Request, mockResponse as Response)

      expect(mockJson).toHaveBeenCalledWith(mockReports)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should pass query parameters through setReadRegions', async () => {
      mockRequest.query = {
        sortBy: 'createdAt',
        sortDir: 'asc',
        status: 'draft',
      }

      const filteredQuery = {
        sortBy: 'createdAt',
        sortDir: 'asc',
        status: 'draft',
        'region.in': [1, 2],
      }

      ;(setReadRegions as jest.Mock).mockResolvedValue(filteredQuery)
      ;(CRServices.getReports as jest.Mock).mockResolvedValue({ count: 0, rows: [] })

      await getReports(mockRequest as Request, mockResponse as Response)

      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, 123)
      expect(CRServices.getReports).toHaveBeenCalledWith(filteredQuery)
    })

    it('should handle currentUserId errors', async () => {
      const error = new Error('Authentication failed')
      ;(currentUserId as jest.Mock).mockRejectedValue(error)

      await getReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle setReadRegions errors', async () => {
      const error = new Error('Access validation failed')
      ;(setReadRegions as jest.Mock).mockRejectedValue(error)

      await getReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed')
      ;(CRServices.getReports as jest.Mock).mockRejectedValue(error)

      await getReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle all steps successfully with complex query', async () => {
      mockRequest.query = {
        offset: '10',
        limit: '25',
        sortBy: 'title',
        sortDir: 'desc',
        status: 'approved',
      }

      const userId = 456
      const filteredQuery = {
        offset: '10',
        limit: '25',
        sortBy: 'title',
        sortDir: 'desc',
        status: 'approved',
        'region.in': [3, 4, 5],
      }

      const mockReports = {
        count: 50,
        rows: Array.from({ length: 25 }, (_, i) => ({
          id: i + 11,
          title: `Report ${i + 11}`,
          status: 'approved',
        })),
      }

      ;(currentUserId as jest.Mock).mockResolvedValue(userId)
      ;(setReadRegions as jest.Mock).mockResolvedValue(filteredQuery)
      ;(CRServices.getReports as jest.Mock).mockResolvedValue(mockReports)

      await getReports(mockRequest as Request, mockResponse as Response)

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, userId)
      expect(CRServices.getReports).toHaveBeenCalledWith(filteredQuery)
      expect(mockJson).toHaveBeenCalledWith(mockReports)
      expect(handleErrors).not.toHaveBeenCalled()
    })
  })

  describe('submitReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' }
      mockRequest.body = { approvers: [] }
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' })
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canUpdate: jest.fn().mockReturnValue(true),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )
    })

    it('should successfully submit a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
        lastUpdatedById: 456,
      }

      const submittedReport = {
        ...mockReport,
        submissionStatus: 'submitted',
        lastUpdatedById: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(submittedReport)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(
        {
          ...mockReport,
          lastUpdatedById: 123,
          calculatedStatus: 'submitted',
          submissionStatus: 'submitted',
          submittedAt: expect.any(Date),
          approvers: [],
        },
        mockReport
      )
      expect(db.CollabReportApprover.update).toHaveBeenCalledWith(
        { status: null },
        {
          where: { status: 'needs_action', collabReportId: '1' },
          individualHooks: true,
        }
      )
      expect(mockJson).toHaveBeenCalledWith(submittedReport)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should not reset approver statuses when an initial approver is added', async () => {
      const existingReport = {
        id: '1',
        title: 'Original Report',
        content: 'Original content',
        regionId: 1,
        approvers: [],
      }

      mockRequest.body = {
        title: 'Updated Report',
        approvers: [{ user: { id: 456 } }],
      }

      const savedReport = {
        ...existingReport,
        ...mockRequest.body,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(existingReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(savedReport)

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(
        { ...existingReport, ...mockRequest.body, lastUpdatedById: 123 },
        existingReport
      )
      // Only a new approver, so additions > 0
      expect(db.CollabReportApprover.update).toHaveBeenCalledTimes(0)
    })

    it('should not reset approver statuses when adding a new approver to a report with existing approvers', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
        lastUpdatedById: 456,
        approvers: [{ user: { id: 111 } }],
      }

      mockRequest.body = { approvers: [{ user: { id: 111 } }, { user: { id: 222 } }] }

      const submittedReport = {
        ...mockReport,
        submissionStatus: 'submitted',
        lastUpdatedById: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(submittedReport)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(
        {
          ...mockReport,
          lastUpdatedById: 123,
          calculatedStatus: 'submitted',
          submissionStatus: 'submitted',
          submittedAt: expect.any(Date),
          approvers: [{ user: { id: 111 } }, { user: { id: 222 } }],
        },
        mockReport
      )
      // Should not update due to adding a new approver
      expect(db.CollabReportApprover.update).toHaveBeenCalledTimes(0)
    })

    it('should reset approver statuses when not adding a new approver', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
        lastUpdatedById: 456,
        approvers: [{ user: { id: 111 } }, { user: { id: 222 } }],
      }

      mockRequest.body = { approvers: [{ user: { id: 111 } }, { user: { id: 222 } }] }

      const submittedReport = {
        ...mockReport,
        submissionStatus: 'submitted',
        lastUpdatedById: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(submittedReport)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(
        {
          ...mockReport,
          lastUpdatedById: 123,
          calculatedStatus: 'submitted',
          submissionStatus: 'submitted',
          submittedAt: expect.any(Date),
          approvers: [{ user: { id: 111 } }, { user: { id: 222 } }],
        },
        mockReport
      )
      // Should update due to not adding any new approvers
      expect(db.CollabReportApprover.update).toHaveBeenCalledTimes(1)
    })

    it('should return HTTP 404 when report is not found', async () => {
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled()
    })

    it('should return HTTP 403 when user is not authorized', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'draft',
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canUpdate: jest.fn().mockReturnValue(false),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(403)
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const error = new Error('Database error')
      ;(CRServices.collabReportById as jest.Mock).mockRejectedValue(error)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should handle missing collabReportId param', async () => {
      mockRequest.params = {}
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith(undefined)
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle createOrUpdateReport errors', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'draft',
      }
      const error = new Error('Update failed')

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockRejectedValue(error)

      await submitReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
    })
  })

  describe('reviewReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' }
      mockRequest.body = { status: 'approved', note: 'Looks good!' }
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' })
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canReview: jest.fn().mockReturnValue(true),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )
    })

    it('should successfully review a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      }

      const mockApprover = {
        id: 1,
        status: 'approved',
        note: 'Looks good!',
        collabReportId: '1',
        userId: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(upsertApprover as jest.Mock).mockResolvedValue(mockApprover)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(upsertApprover).toHaveBeenCalledWith({
        status: 'approved',
        note: 'Looks good!',
        collabReportId: '1',
        userId: 123,
      })
      expect(mockJson).toHaveBeenCalledWith(mockApprover)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should return HTTP 404 when report is not found', async () => {
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
      expect(upsertApprover).not.toHaveBeenCalled()
    })

    it('should return HTTP 403 when user is not authorized', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canReview: jest.fn().mockReturnValue(false),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(403)
      expect(mockJson).not.toHaveBeenCalled()
      expect(upsertApprover).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const error = new Error('Database error')
      ;(CRServices.collabReportById as jest.Mock).mockRejectedValue(error)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should handle missing collabReportId param', async () => {
      mockRequest.params = {}
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith(undefined)
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle upsertApprover errors', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      }
      const error = new Error('Approver upsert failed')

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(upsertApprover as jest.Mock).mockRejectedValue(error)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
    })

    it('should handle review with needs_action status', async () => {
      mockRequest.body = { status: 'needs_action', note: 'Please revise section 2' }

      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      }

      const mockApprover = {
        id: 1,
        status: 'needs_action',
        note: 'Please revise section 2',
        collabReportId: '1',
        userId: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(upsertApprover as jest.Mock).mockResolvedValue(mockApprover)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(upsertApprover).toHaveBeenCalledWith({
        status: 'needs_action',
        note: 'Please revise section 2',
        collabReportId: '1',
        userId: 123,
      })
      expect(mockJson).toHaveBeenCalledWith(mockApprover)
    })

    it('should handle review without note', async () => {
      mockRequest.body = { status: 'approved' }

      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      }

      const mockApprover = {
        id: 1,
        status: 'approved',
        note: undefined,
        collabReportId: '1',
        userId: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(upsertApprover as jest.Mock).mockResolvedValue(mockApprover)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(upsertApprover).toHaveBeenCalledWith({
        status: 'approved',
        note: undefined,
        collabReportId: '1',
        userId: 123,
      })
      expect(mockJson).toHaveBeenCalledWith(mockApprover)
    })

    it('should handle empty request body', async () => {
      mockRequest.body = {}

      const mockReport = {
        id: '1',
        name: 'Report 1',
        status: 'submitted',
      }

      const mockApprover = {
        id: 1,
        status: undefined,
        note: undefined,
        collabReportId: '1',
        userId: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(upsertApprover as jest.Mock).mockResolvedValue(mockApprover)

      await reviewReport(mockRequest as Request, mockResponse as Response)

      expect(upsertApprover).toHaveBeenCalledWith({
        status: undefined,
        note: undefined,
        collabReportId: '1',
        userId: 123,
      })
      expect(mockJson).toHaveBeenCalledWith(mockApprover)
    })
  })

  describe('softDeleteReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' }
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' })
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canDelete: jest.fn().mockReturnValue(true),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )
    })

    it('should successfully delete a report', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CRServices.deleteReport as jest.Mock).mockResolvedValue(undefined)

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(userById).toHaveBeenCalledWith(123)
      expect(CollabReportPolicy).toHaveBeenCalledWith({ id: 123, name: 'Test User' }, mockReport)
      expect(CRServices.deleteReport).toHaveBeenCalledWith(mockReport)
      expect(mockSendStatus).toHaveBeenCalledWith(204)
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should return HTTP 404 when report is not found', async () => {
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.deleteReport).not.toHaveBeenCalled()
      expect(currentUserId).not.toHaveBeenCalled()
    })

    it('should return HTTP 403 when user is not authorized to delete', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canDelete: jest.fn().mockReturnValue(false),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(userById).toHaveBeenCalledWith(123)
      expect(CollabReportPolicy).toHaveBeenCalledWith({ id: 123, name: 'Test User' }, mockReport)
      expect(mockSendStatus).toHaveBeenCalledWith(403)
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.deleteReport).not.toHaveBeenCalled()
    })

    it('should handle service errors from collabReportById', async () => {
      const error = new Error('Database connection failed')
      ;(CRServices.collabReportById as jest.Mock).mockRejectedValue(error)

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSendStatus).not.toHaveBeenCalled()
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.deleteReport).not.toHaveBeenCalled()
    })

    it('should handle errors from deleteReport service', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
      }
      const error = new Error('Delete operation failed')

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(CRServices.deleteReport as jest.Mock).mockRejectedValue(error)

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(CRServices.deleteReport).toHaveBeenCalledWith(mockReport)
      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSendStatus).not.toHaveBeenCalled()
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle currentUserId errors', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
      }
      const error = new Error('Authentication failed')

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(currentUserId as jest.Mock).mockRejectedValue(error)

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSendStatus).not.toHaveBeenCalled()
      expect(CRServices.deleteReport).not.toHaveBeenCalled()
    })

    it('should handle userById errors', async () => {
      const mockReport = {
        id: '1',
        name: 'Report 1',
        submissionStatus: 'draft',
      }
      const error = new Error('User not found')

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(mockReport)
      ;(userById as jest.Mock).mockRejectedValue(error)

      await softDeleteReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(userById).toHaveBeenCalledWith(123)
      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSendStatus).not.toHaveBeenCalled()
      expect(CRServices.deleteReport).not.toHaveBeenCalled()
    })
  })
  describe('createReport', () => {
    beforeEach(() => {
      mockRequest.body = {
        title: 'New Report',
        regionId: 1,
        collaborators: [{ userId: 456, email: 'collaborator@example.com' }],
      }
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' })
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canCreate: jest.fn().mockReturnValue(true),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )
    })

    it('should successfully create a new report', async () => {
      const newReport = {
        title: 'New Report',
        regionId: 1,
        collaborators: [{ userId: 456, email: 'collaborator@example.com' }],
        submissionStatus: 'draft',
        userId: 123,
        lastUpdatedById: 123,
      }

      const createdReport = {
        id: '1',
        ...newReport,
        collabReportSpecialists: [{ userId: 456, user: { email: 'collaborator@example.com' } }],
      }

      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(createdReport)

      await createReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(newReport, null)
      expect(mockJson).toHaveBeenCalledWith(createdReport)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should return HTTP 400 when request body is missing', async () => {
      mockRequest.body = null

      await createReport(mockRequest as Request, mockResponse as Response)

      expect(mockSendStatus).toHaveBeenCalledWith(400)
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled()
    })

    it('should return HTTP 403 when user is not authorized to create', async () => {
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canCreate: jest.fn().mockReturnValue(false),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )

      await createReport(mockRequest as Request, mockResponse as Response)

      expect(mockSendStatus).toHaveBeenCalledWith(403)
      expect(mockJson).not.toHaveBeenCalled()
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled()
    })

    it('should create report without collaborators', async () => {
      mockRequest.body = {
        title: 'Solo Report',
        regionId: 1,
      }

      const newReport = {
        title: 'Solo Report',
        regionId: 1,
        submissionStatus: 'draft',
        userId: 123,
        lastUpdatedById: 123,
      }

      const createdReport = {
        id: '1',
        ...newReport,
        collabReportSpecialists: null,
      }

      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(createdReport)

      await createReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(newReport, null)
      expect(mockJson).toHaveBeenCalledWith(createdReport)
    })

    it('should handle service errors', async () => {
      const error = new Error('Database error')
      ;(CRServices.createOrUpdateReport as jest.Mock).mockRejectedValue(error)

      await createReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
      expect(mockSendStatus).not.toHaveBeenCalled()
    })
  })

  describe('saveReport', () => {
    beforeEach(() => {
      mockRequest.params = { collabReportId: '1' }
      mockRequest.body = {
        title: 'Updated Report',
        content: 'Updated content',
      }
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(userById as jest.Mock).mockResolvedValue({ id: 123, name: 'Test User' })
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canUpdate: jest.fn().mockReturnValue(true),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )
    })

    it('should successfully save a report', async () => {
      const existingReport = {
        id: '1',
        title: 'Original Report',
        content: 'Original content',
        regionId: 1,
        userId: 123,
        collabReportSpecialists: [{ user: { email: 'existing@example.com' } }],
      }

      const updatedReport = {
        title: 'Updated Report',
        content: 'Updated content',
        lastUpdatedById: 123,
      }

      const savedReport = {
        ...existingReport,
        ...updatedReport,
        collabReportSpecialists: [
          { user: { email: 'existing@example.com' } },
          { userId: 456, user: { email: 'new@example.com' } },
        ],
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(existingReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue(savedReport)

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(
        { ...existingReport, ...updatedReport },
        existingReport
      )
    })

    it('should return HTTP 400 when request body is missing', async () => {
      mockRequest.body = null

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(mockSendStatus).toHaveBeenCalledWith(400)
      expect(CRServices.collabReportById).not.toHaveBeenCalled()
    })

    it('should return HTTP 404 when report is not found', async () => {
      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(null)

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.collabReportById).toHaveBeenCalledWith('1')
      expect(mockSendStatus).toHaveBeenCalledWith(404)
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled()
    })

    it('should return HTTP 403 when user is not authorized to update', async () => {
      const existingReport = {
        id: '1',
        title: 'Original Report',
        regionId: 1,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(existingReport)
      ;(CollabReportPolicy as jest.MockedClass<typeof CollabReportPolicy>).mockImplementation(
        () =>
          ({
            canUpdate: jest.fn().mockReturnValue(false),
          }) as unknown as jest.Mocked<CollabReportPolicy>
      )

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(mockSendStatus).toHaveBeenCalledWith(403)
      expect(CRServices.createOrUpdateReport).not.toHaveBeenCalled()
    })

    it('should remove regionId from updates', async () => {
      const existingReport = {
        id: '1',
        title: 'Original Report',
        regionId: 1,
        collabReportSpecialists: [],
      }

      mockRequest.body = {
        title: 'Updated Report',
        regionId: 2, // This should be removed
      }

      const expectedUpdate = {
        title: 'Updated Report',
        lastUpdatedById: 123,
      }

      ;(CRServices.collabReportById as jest.Mock).mockResolvedValue(existingReport)
      ;(CRServices.createOrUpdateReport as jest.Mock).mockResolvedValue({
        ...existingReport,
        ...expectedUpdate,
      })

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(CRServices.createOrUpdateReport).toHaveBeenCalledWith(
        { ...existingReport, ...expectedUpdate },
        existingReport
      )
    })

    it('should handle service errors', async () => {
      const error = new Error('Database error')
      ;(CRServices.collabReportById as jest.Mock).mockRejectedValue(error)

      await saveReport(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
    })
  })

  describe('getAlerts', () => {
    beforeEach(() => {
      mockRequest.query = {}
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(setReadRegions as jest.Mock).mockResolvedValue({})
    })

    it('should return alerts with filtered status', async () => {
      const mockAlerts = {
        count: 2,
        rows: [
          { id: '1', name: 'Alert 1', status: 'draft' },
          { id: '2', name: 'Alert 2', status: 'submitted' },
        ],
      }

      ;(CRServices.getReports as jest.Mock).mockResolvedValue(mockAlerts)
      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(setReadRegions).toHaveBeenCalledWith({}, 123)
      expect(CRServices.getReports).toHaveBeenCalledWith({
        limit: 'all',
        status: [REPORT_STATUSES.DRAFT, REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.NEEDS_ACTION],
        userId: 123,
      })
      expect(mockJson).toHaveBeenCalledWith(mockAlerts)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should return empty results when no alerts are found', async () => {
      const mockAlerts = {
        count: 0,
        rows: [],
      }

      ;(CRServices.getReports as jest.Mock).mockResolvedValue(mockAlerts)
      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(mockJson).toHaveBeenCalledWith(mockAlerts)
      expect(mockSendStatus).not.toHaveBeenCalled()
    })

    it('should merge query parameters with status filter', async () => {
      mockRequest.query = {
        sortBy: 'createdAt',
        sortDir: 'desc',
      }

      const filteredQuery = {
        sortBy: 'createdAt',
        sortDir: 'desc',
        'region.in': [1, 2],
      }

      ;(setReadRegions as jest.Mock).mockResolvedValue(filteredQuery)
      ;(CRServices.getReports as jest.Mock).mockResolvedValue({ count: 0, rows: [] })

      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, 123)
      expect(CRServices.getReports).toHaveBeenCalledWith({
        ...filteredQuery,
        limit: 'all',
        status: [REPORT_STATUSES.DRAFT, REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.NEEDS_ACTION],
        userId: 123,
      })
    })

    it('should handle currentUserId errors', async () => {
      const error = new Error('Authentication failed')
      ;(currentUserId as jest.Mock).mockRejectedValue(error)

      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle setReadRegions errors', async () => {
      const error = new Error('Access validation failed')
      ;(setReadRegions as jest.Mock).mockRejectedValue(error)

      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed')
      ;(CRServices.getReports as jest.Mock).mockRejectedValue(error)

      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockJson).not.toHaveBeenCalled()
    })

    it('should handle complex query with all steps successfully', async () => {
      mockRequest.query = {
        offset: '5',
        sortBy: 'title',
        sortDir: 'asc',
        'creator.in': ['123', '456'],
      }

      const userId = 789
      const filteredQuery = {
        offset: '5',
        sortBy: 'title',
        sortDir: 'asc',
        'creator.in': ['123', '456'],
        'region.in': [1, 3, 5],
      }

      const mockAlerts = {
        count: 8,
        rows: Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          title: `Alert ${i + 1}`,
          status: ['draft', 'submitted', 'needs_action'][i % 3],
        })),
      }

      ;(currentUserId as jest.Mock).mockResolvedValue(userId)
      ;(setReadRegions as jest.Mock).mockResolvedValue(filteredQuery)
      ;(CRServices.getReports as jest.Mock).mockResolvedValue(mockAlerts)

      await getAlerts(mockRequest as Request, mockResponse as Response)

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, userId)
      expect(CRServices.getReports).toHaveBeenCalledWith({
        ...filteredQuery,
        limit: 'all',
        status: [REPORT_STATUSES.DRAFT, REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.NEEDS_ACTION],
        userId,
      })
      expect(mockJson).toHaveBeenCalledWith(mockAlerts)
      expect(handleErrors).not.toHaveBeenCalled()
    })
  })

  describe('downloadReports', () => {
    beforeEach(() => {
      mockRequest.query = {}
      ;(currentUserId as jest.Mock).mockResolvedValue(123)
      ;(setReadRegions as jest.Mock).mockResolvedValue({})
    })

    it('should successfully download reports as CSV', async () => {
      const mockReports = [
        { id: '1', name: 'Report 1', description: 'Description 1' },
        { id: '2', name: 'Report 2', description: 'Description 2' },
      ]

      const mockCsvRecords = [
        { displayId: 'R01-CR-001', name: 'Report 1', description: 'Description 1' },
        { displayId: 'R01-CR-002', name: 'Report 2', description: 'Description 2' },
      ]

      ;(CRServices.getCSVReports as jest.Mock).mockResolvedValue(mockReports)
      ;(collabReportToCsvRecord as jest.Mock)
        .mockResolvedValueOnce(mockCsvRecords[0])
        .mockResolvedValueOnce(mockCsvRecords[1])

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(currentUserId).toHaveBeenCalledWith(mockRequest, mockResponse)
      expect(setReadRegions).toHaveBeenCalledWith({}, 123)
      expect(CRServices.getCSVReports).toHaveBeenCalledWith({})
      expect(collabReportToCsvRecord).toHaveBeenCalledTimes(2)
      expect(mockSend).toHaveBeenCalled()
    })

    it('should handle empty reports gracefully', async () => {
      const mockReports: never[] = []

      ;(CRServices.getCSVReports as jest.Mock).mockResolvedValue(mockReports)

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(CRServices.getCSVReports).toHaveBeenCalledWith({})
      expect(collabReportToCsvRecord).not.toHaveBeenCalled()
      expect(mockSend).toHaveBeenCalledWith('\n')
    })

    it('should pass query parameters through setReadRegions', async () => {
      mockRequest.query = {
        sortBy: 'createdAt',
        sortDir: 'desc',
        status: 'approved',
        'region.in': ['1', '2'],
      }

      const filteredQuery = {
        sortBy: 'createdAt',
        sortDir: 'desc',
        status: 'approved',
        'region.in': [1, 2],
      }

      ;(setReadRegions as jest.Mock).mockResolvedValue(filteredQuery)
      ;(CRServices.getCSVReports as jest.Mock).mockResolvedValue([])

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(setReadRegions).toHaveBeenCalledWith(mockRequest.query, 123)
      expect(CRServices.getCSVReports).toHaveBeenCalledWith(filteredQuery)
    })

    it('should handle currentUserId errors', async () => {
      const error = new Error('Authentication failed')
      ;(currentUserId as jest.Mock).mockRejectedValue(error)

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should handle setReadRegions errors', async () => {
      const error = new Error('Access validation failed')
      ;(setReadRegions as jest.Mock).mockRejectedValue(error)

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should handle getCSVReports service errors', async () => {
      const error = new Error('Database error')
      ;(CRServices.getCSVReports as jest.Mock).mockRejectedValue(error)

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should handle collabReportToCsvRecord transformation errors', async () => {
      const mockReports = [{ id: '1', name: 'Report 1', description: 'Description 1' }]

      const error = new Error('CSV transformation failed')
      ;(CRServices.getCSVReports as jest.Mock).mockResolvedValue(mockReports)
      ;(collabReportToCsvRecord as jest.Mock).mockRejectedValue(error)

      await downloadReports(mockRequest as Request, mockResponse as Response)

      expect(handleErrors).toHaveBeenCalledWith(mockRequest, mockResponse, error, {
        namespace: 'SERVICE:COLLAB_REPORTS',
      })
      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('sendCollabReportCSV', () => {
    beforeEach(() => {
      ;(collabReportToCsvRecord as jest.Mock).mockClear()
    })

    it('should generate CSV with headers when reports exist', async () => {
      const mockReports = [
        { id: '1', name: 'Report 1', description: 'Description 1' },
        { id: '2', name: 'Report 2', description: 'Description 2' },
      ]

      const mockCsvRecords = [
        { displayId: 'R01-CR-001', name: 'Report 1', description: 'Description 1' },
        { displayId: 'R01-CR-002', name: 'Report 2', description: 'Description 2' },
      ]

      ;(collabReportToCsvRecord as jest.Mock)
        .mockResolvedValueOnce(mockCsvRecords[0])
        .mockResolvedValueOnce(mockCsvRecords[1])

      await sendCollabReportCSV(mockReports, mockResponse)

      expect(collabReportToCsvRecord).toHaveBeenCalledTimes(2)
      expect(collabReportToCsvRecord).toHaveBeenCalledWith(mockReports[0])
      expect(collabReportToCsvRecord).toHaveBeenCalledWith(mockReports[1])
      expect(mockSend).toHaveBeenCalled()

      // Verify CSV content structure
      const csvCall = mockSend.mock.calls[0][0]
      expect(csvCall).toContain(
        '"Report ID","Activity name","Start date","End date","Duration","Purpose","Is state activity","Method","Description","Next steps","Created date","Last updated date"'
      )
      expect(csvCall).toContain('"R01-CR-001","Report 1"')
      expect(csvCall).toContain('"R01-CR-002","Report 2"')
    })

    it('should generate empty CSV when no reports exist', async () => {
      const mockReports: never[] = []

      await sendCollabReportCSV(mockReports, mockResponse)

      expect(collabReportToCsvRecord).not.toHaveBeenCalled()
      expect(mockSend).toHaveBeenCalledWith('\n')
    })

    it('should handle single report', async () => {
      const mockReports = [{ id: '1', name: 'Single Report', description: 'Single Description' }]

      const mockCsvRecord = {
        displayId: 'R01-CR-001',
        name: 'Single Report',
        description: 'Single Description',
      }

      ;(collabReportToCsvRecord as jest.Mock).mockResolvedValue(mockCsvRecord)

      await sendCollabReportCSV(mockReports, mockResponse)

      expect(collabReportToCsvRecord).toHaveBeenCalledTimes(1)
      expect(collabReportToCsvRecord).toHaveBeenCalledWith(mockReports[0])
      expect(mockSend).toHaveBeenCalled()

      const csvCall = mockSend.mock.calls[0][0]
      expect(csvCall).toContain(
        '"Report ID","Activity name","Start date","End date","Duration","Purpose","Is state activity","Method","Description","Next steps","Created date","Last updated date"'
      )
      expect(csvCall).toContain('"R01-CR-001","Single Report"')
    })

    it('should handle reports with special characters in CSV', async () => {
      const mockReports = [
        { id: '1', name: 'Report "with quotes"', description: 'Description,with,commas' },
      ]

      const mockCsvRecord = {
        displayId: 'R01-CR-001',
        name: 'Report "with quotes"',
        description: 'Description,with,commas',
      }

      ;(collabReportToCsvRecord as jest.Mock).mockResolvedValue(mockCsvRecord)

      await sendCollabReportCSV(mockReports, mockResponse)

      expect(mockSend).toHaveBeenCalled()
      const csvCall = mockSend.mock.calls[0][0]
      expect(csvCall).toContain('"Report ""with quotes"""')
      expect(csvCall).toContain('"Description,with,commas"')
    })

    it('should handle transformation errors gracefully', async () => {
      const mockReports = [
        { id: '1', name: 'Report 1', description: 'Description 1' },
        { id: '2', name: 'Report 2', description: 'Description 2' },
      ]

      ;(collabReportToCsvRecord as jest.Mock)
        .mockResolvedValueOnce({
          displayId: 'R01-CR-001',
          name: 'Report 1',
          description: 'Description 1',
        })
        .mockRejectedValueOnce(new Error('Transformation failed'))

      // The function should still complete and send partial results
      await expect(sendCollabReportCSV(mockReports, mockResponse)).rejects.toThrow(
        'Transformation failed'
      )

      expect(collabReportToCsvRecord).toHaveBeenCalledTimes(2)
    })

    it('should handle empty string values in CSV records', async () => {
      const mockReports = [{ id: '1', name: '', description: null }]

      const mockCsvRecord = {
        displayId: 'R01-CR-001',
        name: '',
        description: '',
      }

      ;(collabReportToCsvRecord as jest.Mock).mockResolvedValue(mockCsvRecord)

      await sendCollabReportCSV(mockReports, mockResponse)

      expect(mockSend).toHaveBeenCalled()
      const csvCall = mockSend.mock.calls[0][0]
      expect(csvCall).toContain('"R01-CR-001","",""')
    })

    it('should generate proper CSV format with correct column structure', async () => {
      const mockReports = [{ id: '1', name: 'Test Report', description: 'Test Description' }]

      const mockCsvRecord = {
        displayId: 'R01-CR-001',
        name: 'Test Report',
        description: 'Test Description',
      }

      ;(collabReportToCsvRecord as jest.Mock).mockResolvedValue(mockCsvRecord)

      await sendCollabReportCSV(mockReports, mockResponse)

      const csvCall = mockSend.mock.calls[0][0]
      const lines = csvCall.split('\n')

      // Should have header and data lines
      expect(lines.length).toBeGreaterThanOrEqual(2)
      expect(lines[0]).toBe(
        '"Report ID","Activity name","Start date","End date","Duration","Purpose","Is state activity","Method","Description","Next steps","Created date","Last updated date"'
      )
      expect(lines[1]).toContain('"R01-CR-001"')
      expect(lines[1]).toContain('"Test Report"')
      expect(lines[1]).toContain('"Test Description"')
    })
  })
})
