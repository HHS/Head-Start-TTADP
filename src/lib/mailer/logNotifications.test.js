import { DIGEST_SUBJECT_FREQ, EMAIL_ACTIONS } from '../../constants'
import db from '../../models'
import logEmailNotification, { logDigestEmailNotification } from './logNotifications'
import * as mailerLogM from '../../services/mailerLog'
import { logger } from '../../logger'

jest.mock('../../logger')

const createMailerLogMock = jest.spyOn(mailerLogM, 'createMailerLog')

describe('Email Notifications', () => {
  const mockJob = {
    id: '3',
    name: EMAIL_ACTIONS.COLLABORATOR_ADDED,
    data: {
      programSpecialists: [{ email: 'mockSpecialist@test.gov' }],
      recipients: [{ name: 'Mock Recipient' }],
      report: {
        id: 1235,
        displayId: 'AR-04-1235',
        author: {
          email: 'mockAuthor@test.gov',
          name: 'Mock Author',
        },
        activityReportCollaborators: [
          {
            user: {
              email: 'mockCollaborator@test.gov',
              name: 'Mock Collaborator',
            },
          },
        ],
      },
      newCollaborator: {
        email: 'mockNewCollaborator@test.gov',
        name: 'Mock New Collaborator',
      },
      newApprover: {
        user: {
          email: 'mockNewApprover@test.gov',
          name: 'Mock New Approver',
        },
      },
    },
  }
  const mockJobDigest = {
    id: '3',
    name: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
    data: {
      user: {
        email: 'mockUser@test.gov',
      },
      reports: [
        {
          id: 1235,
          displayId: 'AR-04-1235',
        },
        {
          id: 2345,
          displayId: 'AR-08-2345',
        },
      ],
      subjectFreq: DIGEST_SUBJECT_FREQ.DAILY,
    },
  }

  const success = false
  const result = {
    errno: -4078,
    code: 'ESOCKET',
    syscall: 'connect',
    address: '127.0.0.1',
    port: 1025,
    command: 'CONN',
  }

  beforeAll(() => {
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await db.sequelize.close()
    jest.clearAllMocks()
  })

  describe('on demand', () => {
    it('create a mailer log entry for a collaborator added', async () => {
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJob.id,
        emailTo: [mockJob.data.newCollaborator.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Added as collaborator',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('mockNewCollaborator@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Added as collaborator')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
    })

    it('handles missing new collaborator', async () => {
      const collab = { ...mockJob.data.newCollaborator }
      mockJob.data.newCollaborator = null
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJob.id,
        emailTo: [''],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Added as collaborator',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Added as collaborator')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      mockJob.data.newCollaborator = collab
    })
    it('create a mailer log entry for a submitted report', async () => {
      mockJob.name = EMAIL_ACTIONS.SUBMITTED
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJob.id,
        emailTo: [mockJob.data.newApprover.user.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Submitted for review',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('mockNewApprover@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Submitted for review')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
    })

    it('handles missing newApprover for a submitted report', async () => {
      mockJob.name = EMAIL_ACTIONS.SUBMITTED
      const approv = { ...mockJob.data.newApprover }
      mockJob.data.newApprover = null
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJob.id,
        emailTo: [''],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Submitted for review',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Submitted for review')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      mockJob.data.newApprover = approv
    })

    it('create a mailer log entry for a needs action report', async () => {
      mockJob.name = EMAIL_ACTIONS.NEEDS_ACTION
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJob.id,
        emailTo: [mockJob.data.report.author.email, mockJob.data.report.activityReportCollaborators[0].user.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Changes requested',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(2)
      expect(mailerLog.emailTo[0]).toEqual('mockAuthor@test.gov')
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Changes requested')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
    })
    it('handles missing author for a needs action report', async () => {
      const auth = mockJob.data.report.author
      mockJob.data.report.author = null
      mockJob.name = EMAIL_ACTIONS.NEEDS_ACTION
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJob.id,
        emailTo: ['', mockJob.data.report.activityReportCollaborators[0].user.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Changes requested',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(2)
      expect(mailerLog.emailTo[0]).toEqual('')
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Changes requested')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      mockJob.data.report.author = auth
    })
    it('create a mailer log entry for an approved report', async () => {
      mockJob.name = EMAIL_ACTIONS.APPROVED
      createMailerLogMock.mockResolvedValue({
        jobId: mockJob.id,
        emailTo: [mockJob.data.report.author.email, mockJob.data.report.activityReportCollaborators[0].user.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Approved',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toBe(2)
      expect(mailerLog.emailTo[0]).toEqual('mockAuthor@test.gov')
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Approved')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
    })

    it('handles missing author for an approved report', async () => {
      mockJob.name = EMAIL_ACTIONS.APPROVED
      const auth = mockJob.data.report.author
      mockJob.data.report.author = null
      createMailerLogMock.mockResolvedValue({
        jobId: mockJob.id,
        emailTo: ['', mockJob.data.report.activityReportCollaborators[0].user.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Approved',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toBe(2)
      expect(mailerLog.emailTo[0]).toEqual('')
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Approved')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      mockJob.data.report.author = auth
    })
    it('create a mailer log entry for a recipient approved report', async () => {
      mockJob.name = EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED
      createMailerLogMock.mockResolvedValue({
        jobId: mockJob.id,
        emailTo: [mockJob.data.report.author.email, mockJob.data.report.activityReportCollaborators[0].user.email],
        action: mockJob.name,
        subject: 'Activity Report AR-04-1235: Approved',
        activityReports: [mockJob.data.report.id],
        success,
        result,
      })
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toBe(2)
      expect(mailerLog.emailTo[0]).toEqual('mockAuthor@test.gov')
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov')
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Approved')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
    })
    it('logs on error', async () => {
      createMailerLogMock.mockRejectedValueOnce(new Error('Problem creating mailer log'))
      mockJob.name = EMAIL_ACTIONS.APPROVED
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(logger.error).toHaveBeenCalled()
      expect(mailerLog).toBeNull()
    })
    it('returns null on unknown job name', async () => {
      mockJob.name = 'unknown'
      const mailerLog = await logEmailNotification(mockJob, success, result)
      expect(logger.error).toHaveBeenCalled()
      expect(mailerLog).toBeNull()
    })

    it('creates a digest for a training report notification', async () => {
      const actions = [
        EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
        EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
        EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
      ]

      const mockTrJobDigest = {
        id: '3',
        data: {
          emailTo: ['mockUser@test.gov'],
          displayId: 'TR-04-1235',
          reportPath: '/training-reports/1235',
          templatePath: 'tr_session_created',
          report: {
            displayId: 'TR-04-1235',
          },
        },
      }
      createMailerLogMock.mockResolvedValue({
        jobId: mockTrJobDigest.id,
        emailTo: [mockTrJobDigest.data.emailTo[0]],
        action: mockTrJobDigest.name,
        subject: 'A session has been created for Training Report TR-04-1235',
        activityReports: [mockTrJobDigest.data.report],
        success,
        result,
      })
      for (let i = 0; i < actions.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const jobResult = await logEmailNotification(
          {
            ...mockTrJobDigest,
            name: actions[i],
          },
          success,
          result
        )

        expect(jobResult).not.toBeNull()
        expect(jobResult.emailTo.length).toBe(1)
        expect(jobResult.emailTo[0]).toEqual('mockUser@test.gov')
        expect(jobResult.subject).toEqual('A session has been created for Training Report TR-04-1235')
        expect(jobResult.success).toEqual(false)
        expect(jobResult.result).toEqual(result)
      }
    })
  })

  describe('digest', () => {
    it('create a mailer log entry for a collaborator added', async () => {
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJobDigest.id,
        emailTo: [mockJobDigest.data.user.email],
        action: mockJobDigest.name,
        subject: 'TTA Hub daily digest: added as collaborator',
        activityReports: [mockJobDigest.data.reports[0].id, mockJobDigest.data.reports[1].id],
        success,
        result,
      })
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov')
      expect(mailerLog.subject).toEqual('TTA Hub daily digest: added as collaborator')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      expect(mailerLog.jobId).toEqual('3')
      expect(mailerLog.activityReports).toEqual([1235, 2345])
    })
    it('create a mailer log entry for a submitted report', async () => {
      mockJobDigest.name = EMAIL_ACTIONS.SUBMITTED_DIGEST
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJobDigest.id,
        emailTo: [mockJobDigest.data.user.email],
        action: mockJobDigest.name,
        subject: 'TTA Hub daily digest: reports for review',
        activityReports: [mockJobDigest.data.reports[0].id, mockJobDigest.data.reports[1].id],
        success,
        result,
      })
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov')
      expect(mailerLog.subject).toEqual('TTA Hub daily digest: reports for review')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      expect(mailerLog.jobId).toEqual('3')
      expect(mailerLog.activityReports).toEqual([1235, 2345])
    })
    it('create a mailer log entry for a needs action report', async () => {
      mockJobDigest.name = EMAIL_ACTIONS.NEEDS_ACTION_DIGEST
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJobDigest.id,
        emailTo: [mockJobDigest.data.user.email],
        action: mockJobDigest.name,
        subject: 'TTA Hub daily digest: changes requested',
        activityReports: [mockJobDigest.data.reports[0].id, mockJobDigest.data.reports[1].id],
        success,
        result,
      })
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toEqual(1)
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov')
      expect(mailerLog.subject).toEqual('TTA Hub daily digest: changes requested')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
      expect(mailerLog.jobId).toEqual('3')
      expect(mailerLog.activityReports).toEqual([1235, 2345])
    })
    it('create a mailer log entry for an approved report', async () => {
      mockJobDigest.name = EMAIL_ACTIONS.APPROVED_DIGEST
      createMailerLogMock.mockResolvedValueOnce({
        jobId: mockJobDigest.id,
        emailTo: [mockJobDigest.data.user.email],
        action: mockJobDigest.name,
        subject: 'TTA Hub daily digest: approved reports',
        activityReports: [mockJobDigest.data.reports[0].id, mockJobDigest.data.reports[1].id],
        success,
        result,
      })
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result)
      expect(mailerLog).not.toBeNull()
      expect(mailerLog.emailTo.length).toBe(1)
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov')
      expect(mailerLog.subject).toEqual('TTA Hub daily digest: approved reports')
      expect(mailerLog.success).toEqual(false)
      expect(mailerLog.result).toEqual(result)
    })

    it('logs on error', async () => {
      createMailerLogMock.mockRejectedValueOnce(new Error('Problem creating digest mailer log'))
      mockJobDigest.name = EMAIL_ACTIONS.APPROVED_DIGEST
      const record = await logDigestEmailNotification(mockJobDigest, success, result)
      expect(logger.error).toHaveBeenCalled()
      expect(record).toBeNull()
    })
  })
})
