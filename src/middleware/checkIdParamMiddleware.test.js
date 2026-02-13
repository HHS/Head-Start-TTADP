import {
  checkActivityReportIdParam,
  checkReportIdParam,
  checkFileIdParam,
  checkObjectiveIdParam,
  checkObjectiveTemplateIdParam,
  checkGroupIdParam,
  checkAlertIdParam,
  checkIdParam,
  checkRecipientIdParam,
  checkRegionIdParam,
  checkIdIdParam,
  checkCommunicationLogIdParam,
  checkGoalGroupIdParam,
  checkGoalTemplateIdParam,
  checkSessionAttachmentIdParam,
  checkGrantIdParam,
} from './checkIdParamMiddleware'
import { auditLogger } from '../logger'

jest.mock('../lib/apiErrorHandler', () => jest.fn().mockReturnValue(() => Promise.resolve()))
jest.mock('../logger')

const mockResponse = {
  status: jest.fn(() => ({
    send: jest.fn(),
  })),
}
const mockNext = jest.fn()
const errorMessage = 'Received malformed request params'

describe('checkIdParamMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('checkActivityReportIdParam', () => {
    it('calls next if activity report is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          activityReportId: '10',
        },
      }

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if activity report is not string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          activityReportId: '1#0',
        },
      }

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: activityReportId 1#0`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if activity report param is missing', () => {
      const mockRequest = { path: '/api/endpoint' }

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: activityReportId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if activity report param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkActivityReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: activityReportId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkFileIdParam', () => {
    it('calls next if file id is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1',
        },
      }

      checkFileIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1x',
        },
      }

      checkFileIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: fileId 1x`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          reportId: '1',
        },
      }

      checkFileIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: fileId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if fileId param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkFileIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: fileId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if fileId is undefined', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: undefined,
        },
      }

      checkFileIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: fileId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkReportIdParam', () => {
    it('calls next if report id is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1',
          reportId: '2',
        },
      }

      checkReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          reportId: '1x',
        },
      }

      checkReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: reportId 1x`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          fileId: '1',
        },
      }

      checkReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: reportId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if reportId param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkReportIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: reportId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkObjectiveIdParam', () => {
    it('calls next if objective id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          objectiveId: '2',
        },
      }

      checkObjectiveIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param object is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkObjectiveIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: objectiveId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          objectiveId: '2D',
        },
      }

      checkObjectiveIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkObjectiveIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if objectiveId param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkObjectiveIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: objectiveId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkAlertIdParam', () => {
    it('calls next if alert id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          alertId: '1',
        },
      }

      checkAlertIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          alertId: '2D',
        },
      }

      checkAlertIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkAlertIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkObjectiveTemplateIdParam', () => {
    it('calls next if objective id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          objectiveTemplateId: '2',
        },
      }

      checkObjectiveTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param object is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkObjectiveTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: objectiveTemplateId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          objectiveTemplateId: '2D',
        },
      }

      checkObjectiveTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkObjectiveTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if objectiveTemplateId param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkObjectiveTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: objectiveTemplateId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkGroupIdParam', () => {
    it('calls next if objective id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          groupId: '2',
        },
      }

      checkGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          groupId: '2D',
        },
      }

      checkGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if groupId param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: groupId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkIdParam', () => {
    it('calls next if objective id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          arbitraryId: '2',
        },
      }

      checkIdParam(mockRequest, mockResponse, mockNext, 'arbitraryId')
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          arbitraryId: '2D',
        },
      }

      checkIdParam(mockRequest, mockResponse, mockNext, 'arbitraryId')
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkIdParam(mockRequest, mockResponse, mockNext, 'arbitraryId')
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if arbitraryId param is undefined', () => {
      const mockRequest = { path: '/api/endpoint', params: {} }

      checkIdParam(mockRequest, mockResponse, mockNext, 'arbitraryId')
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: arbitraryId undefined`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkRecipientIdParam', () => {
    it('calls next if id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          recipientId: '2',
        },
      }

      checkRecipientIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          recipientId: '2D',
        },
      }

      checkRecipientIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkRecipientIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkRegionIdParam', () => {
    it('calls next if id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          regionId: '2',
        },
      }

      checkRegionIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          regionId: '2D',
        },
      }

      checkRegionIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkRegionIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkIdIdParam', () => {
    it('calls next if id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          id: '2',
        },
      }

      checkIdIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          id: '2D',
        },
      }

      checkIdIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkIdIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkCommunicationLogIdParam', () => {
    it('calls next if id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          communicationLogId: '2',
        },
      }

      checkCommunicationLogIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          communicationLogId: '2D',
        },
      }

      checkCommunicationLogIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkCommunicationLogIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkGoalGroupIdParam', () => {
    it('calls next if id is string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          goalGroupId: '2',
        },
      }

      checkGoalGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          goalGroupId: '2D',
        },
      }

      checkGoalGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('throw 400 if param is missing', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {},
      }

      checkGoalGroupIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkGoalTemplateIdParam', () => {
    it('calls next if goalTemplateId is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          goalTemplateId: '2',
        },
      }

      checkGoalTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          goalTemplateId: '2D',
        },
      }

      checkGoalTemplateIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: goalTemplateId 2D`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkGrantIdParam', () => {
    it('calls next if grantId is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          grantId: '2',
        },
      }

      checkGrantIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('throw 400 if param is not string or integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          grantId: '2D',
        },
      }

      checkGrantIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(auditLogger.error).toHaveBeenCalledWith(`${errorMessage}: grantId 2D`)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('checkSessionAttachmentIdParam', () => {
    it('calls next if sessionAttachmentId is string of integer', () => {
      const mockRequest = {
        path: '/api/endpoint',
        params: {
          sessionAttachmentId: '2',
        },
      }

      checkSessionAttachmentIdParam(mockRequest, mockResponse, mockNext)
      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })
  })
})
