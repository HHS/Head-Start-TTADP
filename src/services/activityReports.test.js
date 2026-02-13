import faker from '@faker-js/faker'
import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common'
import db, {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
  ActivityRecipient,
  User,
  Recipient,
  OtherEntity,
  Grant,
  NextStep,
  Region,
  Permission,
  Role,
  UserRole,
  Program,
  Goal,
  Objective,
  ActivityReportGoal,
} from '../models'
import {
  createOrUpdate,
  activityReportAndRecipientsById,
  possibleRecipients,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReports,
  getAllDownloadableActivityReportAlerts,
  setStatus,
  batchQuery,
  formatResources,
  activityReportsWhereCollaboratorByDate,
  activityReportsChangesRequestedByDate,
  activityReportsSubmittedByDate,
  activityReportsApprovedByDate,
  handleSoftDeleteReport,
} from './activityReports'
import SCOPES from '../middleware/scopeConstants'

import { createGrant, createRecipient, createReport, destroyReport } from '../testUtils'
import { auditLogger } from '../logger'
import { GOAL_STATUS } from '../constants'

const RECIPIENT_ID = 30
const RECIPIENT_ID_SORTING = 31
const ALERT_RECIPIENT_ID = 345

const RECIPIENT_WITH_PROGRAMS_ID = 425
const DOWNLOAD_RECIPIENT_WITH_PROGRAMS_ID = 426

const INACTIVE_GRANT_ID_ONE = faker.datatype.number({ min: 9999 })
const INACTIVE_GRANT_ID_TWO = faker.datatype.number({ min: 9999 })
const INACTIVE_GRANT_ID_THREE = faker.datatype.number({ min: 9999 })

let inactiveActivityReportOne
let inactiveActivityReportTwo
let inactiveActivityReportMissingStartDate

const mockUser = {
  id: 1115665161,
  homeRegionId: 1,
  name: 'user1115665161',
  hsesUsername: 'user1115665161',
  hsesUserId: 'user1115665161',
  lastLogin: new Date(),
}

const mockUserTwo = {
  id: 265157914,
  homeRegionId: 1,
  name: 'user265157914',
  hsesUserId: 'user265157914',
  hsesUsername: 'user265157914',
  lastLogin: new Date(),
}

const mockUserThree = {
  id: 39861962,
  homeRegionId: 1,
  name: 'user39861962',
  hsesUserId: 'user39861962',
  hsesUsername: 'user39861962',
  lastLogin: new Date(),
}

const mockUserFour = {
  id: 49861962,
  homeRegionId: 1,
  name: 'user49861962',
  hsesUserId: 'user49861962',
  hsesUsername: 'user49861962',
  lastLogin: new Date(),
}

const mockUserFive = {
  id: 55861962,
  homeRegionId: 1,
  name: 'user55861962',
  hsesUserId: 'user55861962',
  hsesUsername: 'user55861962',
  lastLogin: new Date(),
}

const alertsMockUserOne = {
  id: 16465416,
  homeRegionId: 1,
  name: 'a',
  hsesUserId: 'a',
  hsesUsername: 'a',
  lastLogin: new Date(),
}

const alertsMockUserTwo = {
  id: 21161130,
  homeRegionId: 1,
  name: 'b',
  hsesUserId: 'b',
  hsesUsername: 'b',
  role: [],
  lastLogin: new Date(),
}

const digestMockCollabOne = {
  id: 21161330,
  homeRegionId: 1,
  name: 'b',
  hsesUserId: 'b',
  hsesUsername: 'b',
  role: [],
  lastLogin: new Date(),
}

const digestMockApprover = {
  id: 21161430,
  homeRegionId: 1,
  name: 'b',
  hsesUserId: 'b',
  hsesUsername: 'b',
  role: [],
  lastLogin: new Date(),
}

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [{ activityRecipientId: RECIPIENT_ID }],
  version: 2,
  language: ['English', 'Spanish'],
  activityReason: 'Recipient requested',
}

const submittedReport = {
  ...reportObject,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
}

describe('formatResources', () => {
  it('skips empties', () => {
    const resources = ['', 'a']
    const result = formatResources(resources)

    expect(result).toStrictEqual(['a'])
  })

  it('handles objects with an empty value', () => {
    const resources = ['', 'a', { value: '' }]
    const result = formatResources(resources)
    expect(result).toStrictEqual(['a'])
  })

  it('handles multiple types of data thrown at it', () => {
    const resources = ['', 'a', { value: '' }, { value: 'c' }, 'b', null]
    const result = formatResources(resources)
    expect(result).toStrictEqual(['a', 'c', 'b'])
  })
})

describe('Activity report service', () => {
  afterAll(async () => {
    await db.sequelize.close()
  })

  describe('Retrieve Alerts', () => {
    beforeAll(async () => {
      await Promise.all([
        User.bulkCreate([mockUserFour, mockUserFive], { validate: true, individualHooks: true }),
        OtherEntity.create({ id: ALERT_RECIPIENT_ID, name: 'alert otherEntity' }),
        Recipient.create({ name: 'alert recipient', id: ALERT_RECIPIENT_ID, uei: 'NNA5N2KHMGN2' }),
        Region.create({ name: 'office 22', id: 22 }),
      ])
      await Grant.create({
        id: ALERT_RECIPIENT_ID,
        number: 1,
        recipientId: ALERT_RECIPIENT_ID,
        regionId: 22,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      })
    })

    afterAll(async () => {
      const userIds = [mockUserFour.id, mockUserFive.id]
      const reports = await ActivityReport.findAll({ where: { userId: userIds } })
      const ids = reports.map((report) => report.id)
      await NextStep.destroy({ where: { activityReportId: ids } })
      await ActivityRecipient.destroy({ where: { activityReportId: ids } })
      await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true })
      await ActivityReportCollaborator.destroy({ where: { activityReportId: ids }, force: true })
      await ActivityReport.destroy({ where: { id: ids } })
      await User.destroy({ where: { id: userIds } })
      await Permission.destroy({ where: { userId: userIds } })
      await OtherEntity.destroy({ where: { id: ALERT_RECIPIENT_ID } })
      await Grant.unscoped().destroy({
        where: { recipientId: [ALERT_RECIPIENT_ID] },
        individualHooks: true,
      })
      await Recipient.unscoped().destroy({ where: { id: [ALERT_RECIPIENT_ID] } })
      await Region.destroy({ where: { id: 22 } })
    })

    it('retrieves myalerts', async () => {
      // Add User Permissions.
      await Permission.create({
        userId: mockUserFour.id,
        regionId: 1,
        scopeId: SCOPES.READ_REPORTS,
      })

      await Permission.create({
        userId: mockUserFive.id,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      })

      // In Draft.
      await ActivityReport.create({
        ...reportObject,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        userId: mockUserFour.id,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      })

      // Submitted.
      await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFour.id,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      })

      // Needs Action.
      await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFour.id,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      })

      // Approved (Should be missing).
      await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFour.id,
        lastUpdatedById: mockUserFour.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      })

      // Is Only Approver.
      const isOnlyApproverReport = await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFive.id,
        lastUpdatedById: mockUserFive.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      })

      // Add Approver.
      await ActivityReportApprover.create({
        activityReportId: isOnlyApproverReport.id,
        userId: mockUserFour.id,
        status: null,
      })

      // Is Only Collaborator.
      const isOnlyCollabReport = await ActivityReport.create({
        ...submittedReport,
        userId: mockUserFive.id,
        lastUpdatedById: mockUserFive.id,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        activityRecipients: [{ activityRecipientId: ALERT_RECIPIENT_ID }],
      })

      // Add Collaborator.
      await ActivityReportCollaborator.create({
        activityReportId: isOnlyCollabReport.id,
        userId: mockUserFour.id,
      })

      const { count, rows } = await activityReportAlerts(mockUserFour.id, {})
      expect(count).toBe(5)

      const counter = rows.reduce(
        (prev, curr) => {
          const val = prev[curr.userId]

          return {
            ...prev,
            [curr.userId]: val + 1,
          }
        },
        {
          [mockUserFour.id]: 0,
          [mockUserFive.id]: 0,
        }
      )

      expect(counter[mockUserFour.id]).toBe(3)
      expect(counter[mockUserFive.id]).toBe(2)
    })
  })

  const idsToExclude = ['R01-AR-9997', 'R01-AR-9998', 'R01-AR-9999', '777', '778', '779']

  describe('Activity Reports DB service', () => {
    beforeAll(async () => {
      await Promise.all([
        User.bulkCreate([mockUser, mockUserTwo, mockUserThree, alertsMockUserOne, alertsMockUserTwo], { validate: true, individualHooks: true }),
        OtherEntity.create({ id: RECIPIENT_ID, name: 'otherEntity' }),
        Recipient.findOrCreate({
          where: { name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGA2' },
        }),
        Region.findOrCreate({ where: { name: 'office 19', id: 19 } }),
      ])

      const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } })
      const healthSpecialist = await Role.findOne({ where: { fullName: 'Health Specialist' } })
      const cor = await Role.findOne({ where: { fullName: 'COR' } })

      await UserRole.create({
        userId: mockUser.id,
        roleId: grantsSpecialist.id,
      })

      await UserRole.create({
        userId: mockUser.id,
        roleId: healthSpecialist.id,
      })

      await UserRole.create({
        userId: mockUserTwo.id,
        roleId: cor.id,
      })

      await Permission.create({
        userId: mockUserTwo.id,
        regionId: 1,
        scopeId: SCOPES.APPROVE_REPORTS,
      })

      await Grant.create({
        id: RECIPIENT_ID,
        number: 1,
        recipientId: RECIPIENT_ID,
        regionId: 19,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      })

      // Create a inactive grant with a 'inactivationDate' date less than 60 days ago.
      await Grant.create({
        id: INACTIVE_GRANT_ID_ONE,
        number: faker.datatype.number({ min: 9999 }),
        recipientId: RECIPIENT_ID,
        regionId: 19,
        status: 'Inactive',
        startDate: new Date(),
        endDate: new Date(),
        inactivationDate: new Date(new Date().setDate(new Date().getDate() - 60)),
      })

      // Create a inactive grant with a 'inactivationDate' date more than 90 days ago.
      await Grant.create({
        id: INACTIVE_GRANT_ID_TWO,
        number: faker.datatype.number({ min: 9999 }),
        recipientId: RECIPIENT_ID,
        regionId: 19,
        status: 'Inactive',
        startDate: new Date(),
        endDate: new Date(),
        inactivationDate: new Date(new Date().setDate(new Date().getDate() - 366)),
      })

      await Grant.create({
        id: INACTIVE_GRANT_ID_THREE,
        number: faker.datatype.number({ min: 9999 }),
        recipientId: RECIPIENT_ID,
        regionId: 19,
        status: 'Inactive',
        startDate: new Date(),
        endDate: new Date(),
        inactivationDate: new Date(),
      })

      // Create a ActivityReport within 60 days.
      inactiveActivityReportOne = await ActivityReport.create({
        ...submittedReport,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        activityRecipients: [],
        // Set a start date that will return the inactive grant.
        startDate: new Date(new Date().setDate(new Date().getDate() - 62)),
        endDate: new Date(new Date().setDate(new Date().getDate() - 62)),
      })

      // Create a ActivityReport outside of 90 days.
      inactiveActivityReportTwo = await ActivityReport.create({
        ...submittedReport,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        activityRecipients: [],
        // Set a start date that will NOT return the inactive grant.
        startDate: new Date(new Date().setDate(new Date().getDate() + 366)),
        endDate: new Date(new Date().setDate(new Date().getDate() + 366)),
      })

      // Create a ActivityReport without start date.
      inactiveActivityReportMissingStartDate = await ActivityReport.create({
        ...submittedReport,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        activityRecipients: [],
        // If there is no start date use today's date.
        startDate: null,
        endDate: null,
      })
    })

    afterAll(async () => {
      const userIds = [mockUser.id, mockUserTwo.id, mockUserThree.id, alertsMockUserOne.id, alertsMockUserTwo.id, mockUserFour.id, mockUserFive.id]

      // Get reports and their IDs
      const reports = await ActivityReport.findAll({ where: { userId: userIds } })
      const ids = reports.map((report) => report.id)

      // Delete dependent entities FIRST (in the correct order)
      await NextStep.destroy({ where: { activityReportId: ids } })
      await ActivityRecipient.destroy({ where: { activityReportId: ids } })
      await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true })
      await ActivityReportCollaborator.destroy({ where: { activityReportId: ids }, force: true })

      await ActivityReport.destroy({ where: { id: ids }, force: true })

      // User-related cleanup
      await UserRole.destroy({ where: { userId: userIds } })
      await Permission.destroy({ where: { userId: userIds } })
      await User.destroy({ where: { id: userIds }, force: true })

      // Delete program dependencies
      await Program.destroy({ where: { id: [585, 586, 587] } })

      // Delete Grants BEFORE Recipients
      await Grant.destroy({
        where: {
          recipientId: [RECIPIENT_ID, RECIPIENT_ID_SORTING, RECIPIENT_WITH_PROGRAMS_ID, DOWNLOAD_RECIPIENT_WITH_PROGRAMS_ID],
        },
        force: true,
        individualHooks: true,
      })

      // Only now delete the Recipients
      await Recipient.unscoped().destroy({
        where: {
          id: [RECIPIENT_ID, RECIPIENT_ID_SORTING, RECIPIENT_WITH_PROGRAMS_ID, DOWNLOAD_RECIPIENT_WITH_PROGRAMS_ID],
        },
        force: true,
        individualHooks: true,
      })

      // Clean up any additional entities
      await OtherEntity.destroy({ where: { id: RECIPIENT_ID }, force: true })
      await Region.destroy({ where: { id: 19 } })
    })

    describe('createOrUpdate', () => {
      it('updates an already saved report', async () => {
        const report = await ActivityReport.create({ ...reportObject, id: 3334 })
        await createOrUpdate(
          {
            ...report,
            ECLKCResourcesUsed: [{ value: 'updated' }],
            activityReason: 'Regional Office requested',
          },
          report
        )
        expect(report.activityRecipientType).toEqual('recipient')
        expect(report.calculatedStatus).toEqual('draft')
        expect(report.ECLKCResourcesUsed).toEqual(['updated'])
        expect(report.language).toStrictEqual(['English', 'Spanish'])
        expect(report.activityReason).toEqual('Regional Office requested')
        expect(report.id).toEqual(3334)
      })

      it('creates a report with no recipient type', async () => {
        const emptyReport = {
          ECLKCResourcesUsed: [{ value: '' }],
          activityRecipientType: null,
          activityRecipients: [],
          activityType: [],
          additionalNotes: null,
          approvingManagerId: null,
          attachments: [],
          activityReportCollaborators: [],
          context: '',
          deliveryMethod: null,
          duration: null,
          endDate: null,
          goals: [],
          recipientNextSteps: [],
          recipients: [],
          nonECLKCResourcesUsed: [{ value: '' }],
          numberOfParticipants: null,
          objectivesWithoutGoals: [],
          otherResources: [],
          participantCategory: '',
          participants: [],
          reason: [],
          requester: null,
          specialistNextSteps: [],
          startDate: null,
          submissionStatus: REPORT_STATUSES.DRAFT,
          targetPopulations: [],
          topics: [],
          pageState: {
            1: 'Not Started',
            2: 'Not Started',
            3: 'Not Started',
            4: 'Not Started',
          },
          userId: mockUser.id,
          regionId: 1,
          ttaType: [],
          lastUpdatedById: 1,
          version: 2,
        }

        const report = await createOrUpdate(emptyReport)
        expect(report.submissionStatus).toEqual(REPORT_STATUSES.DRAFT)
      })

      it('creates a new report', async () => {
        const beginningARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } })
        const report = await createOrUpdate(reportObject)
        const endARCount = await ActivityReport.findAll({ where: { userId: mockUser.id } })
        expect(endARCount.length - beginningARCount.length).toBe(1)
        expect(report.activityRecipients[0].id).toBe(RECIPIENT_ID)
        // Check afterCreate copySubmissionStatus hook
        expect(report.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT)
        expect(report.activityReason).toEqual('Recipient requested')
      })

      it('handles reports with collaborators', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          activityReportCollaborators: [{ user: { id: mockUser.id } }],
        })
        expect(report.activityReportCollaborators.length).toBe(1)
        expect(report.activityReportCollaborators[0].user.name).toBe(mockUser.name)
      })

      it('creates a new report and sets collaborator roles', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          activityReportCollaborators: [{ user: { id: mockUser.id } }, { user: { id: mockUserTwo.id } }, { user: { id: mockUserThree.id } }],
        })

        expect(report.activityReportCollaborators.length).toBe(3)

        // Mock User 1.
        let activityReportCollaborator = report.activityReportCollaborators.filter((u) => u.user.name === mockUser.name)
        expect(activityReportCollaborator).not.toBe(null)
        expect(activityReportCollaborator.length).toBe(1)
        expect(activityReportCollaborator[0].roles.length).toBe(2)
        activityReportCollaborator[0].roles.sort((a, b) => (a.role > b.role ? 1 : -1))
        expect(activityReportCollaborator[0].fullName).toBe('user1115665161, GS, HS')
        expect(activityReportCollaborator[0].roles.map((r) => r.fullName)).toContain('Grants Specialist')
        expect(activityReportCollaborator[0].roles.map((r) => r.fullName)).toContain('Health Specialist')

        // Mock User 2.
        activityReportCollaborator = report.activityReportCollaborators.filter((c) => c.user.name === mockUserTwo.name)
        expect(activityReportCollaborator).not.toBe(null)
        expect(activityReportCollaborator.length).toBe(1)
        expect(activityReportCollaborator[0].fullName).toBe('user265157914, COR')
        expect(activityReportCollaborator[0].roles.length).toBe(1)
        expect(activityReportCollaborator[0].roles[0].fullName).toBe('COR')

        // Mock User 3.
        activityReportCollaborator = report.activityReportCollaborators.filter((c) => c.user.name === mockUserThree.name)
        expect(activityReportCollaborator).not.toBe(null)
        expect(activityReportCollaborator.length).toBe(1)
        expect(activityReportCollaborator[0].fullName).toBe('user39861962')
        expect(activityReportCollaborator[0].roles.length).toBe(0)
      })

      it('updates collaborator roles on a already saved report', async () => {
        const report = await ActivityReport.create({
          ...reportObject,
          id: 3438,
          activityReportCollaborators: [
            { user: { id: mockUserTwo.id } },
            { user: { id: mockUserThree.id } }, // Missing role.
          ],
        })

        const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } })

        await UserRole.create({
          roleId: systemSpecialist.id,
          userId: mockUserThree.id,
        })

        const updatedReport = await createOrUpdate(
          {
            ...report,
            // Remove collaborator 2.
            activityReportCollaborators: [{ user: { id: mockUser.id } }, { user: { id: mockUserThree.id } }],
          },
          report
        )
        expect(updatedReport.activityReportCollaborators.length).toBe(2)

        // Mock User 1.
        let activityReportCollaborator = updatedReport.activityReportCollaborators.filter((u) => u.user.name === mockUser.name)
        expect(activityReportCollaborator).not.toBe(null)
        expect(activityReportCollaborator.length).toBe(1)
        expect(activityReportCollaborator[0].roles.length).toBe(2)
        activityReportCollaborator[0].roles.sort((a, b) => (a.role > b.role ? 1 : -1))
        expect(activityReportCollaborator[0].roles.map((r) => r.fullName)).toContain('Grants Specialist')
        expect(activityReportCollaborator[0].roles.map((r) => r.fullName)).toContain('Health Specialist')

        // Mock User 3.
        activityReportCollaborator = updatedReport.activityReportCollaborators.filter((c) => c.user.name === mockUserThree.name)
        expect(activityReportCollaborator).not.toBe(null)
        expect(activityReportCollaborator.length).toBe(1)
        expect(activityReportCollaborator[0].roles.length).toBe(1)
        expect(activityReportCollaborator[0].roles[0].fullName).toBe('System Specialist') // Updated role.
      })

      it('handles notes being created', async () => {
        // Given an report with some notes
        const reportObjectWithNotes = {
          ...reportObject,
          specialistNextSteps: [
            { note: 'i am groot', completeDate: '05/31/2022' },
            { note: 'harry', completeDate: '06/10/2022' },
          ],
          recipientNextSteps: [
            { note: 'One Piece', completeDate: '06/02/2022' },
            { note: 'Toy Story', completeDate: '06/22/2022' },
          ],
        }
        // When that report is created
        let report
        try {
          report = await createOrUpdate(reportObjectWithNotes)
        } catch (err) {
          auditLogger.error(err)
          throw err
        }
        // Then we see that it was saved correctly
        expect(report.specialistNextSteps.length).toBe(2)
        expect(report.recipientNextSteps.length).toBe(2)
        expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']))
        expect(report.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['05/31/2022', '06/10/2022']))
        expect(report.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']))
        expect(report.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/02/2022', '06/22/2022']))
      })

      it('handles specialist notes being created', async () => {
        // Given a report with specliasts notes
        // And no recipient notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [
            { note: 'i am groot', completeDate: '05/31/2022' },
            { note: 'harry', completeDate: '06/10/2022' },
          ],
          recipientNextSteps: [],
        }

        // When that report is created
        let report
        try {
          report = await createOrUpdate(reportWithNotes)
        } catch (err) {
          auditLogger.error(err)
          throw err
        }

        // Then we see that it was saved correctly
        expect(report.recipientNextSteps.length).toBe(1)
        expect(report.recipientNextSteps).toEqual([{ dataValues: { note: '' } }])
        expect(report.specialistNextSteps.length).toBe(2)
        expect(report.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']))
        expect(report.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['05/31/2022', '06/10/2022']))
      })

      it('handles recipient notes being created', async () => {
        // Given a report with recipient notes
        // And not specialist notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [],
          recipientNextSteps: [
            { note: 'One Piece', completeDate: '06/02/2022' },
            { note: 'Toy Story', completeDate: '06/22/2022' },
          ],
        }

        // When that report is created
        let report
        try {
          report = await createOrUpdate(reportWithNotes)
        } catch (err) {
          auditLogger.error(err)
          throw err
        }

        // Then we see that it was saved correctly
        expect(report.specialistNextSteps.length).toBe(1)
        expect(report.specialistNextSteps).toEqual([{ dataValues: { note: '' } }])
        expect(report.recipientNextSteps.length).toBe(2)
        expect(report.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']))
        expect(report.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/02/2022', '06/22/2022']))
      })

      it('handles specialist notes being updated', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [
            { note: 'i am groot', completeDate: '06/01/2022' },
            { note: 'harry', completeDate: '06/02/2022' },
          ],
          recipientNextSteps: [{ note: 'One Piece' }, { note: 'Toy Story' }],
        }
        const report = await ActivityReport.create(reportWithNotes)

        // When the report is updated with new set of specialist notes
        const notes = {
          specialistNextSteps: [
            { note: 'harry', completeDate: '06/04/2022' },
            { note: 'spongebob', completeDate: '06/06/2022' },
          ],
        }
        const updatedReport = await createOrUpdate(notes, report)

        // Then we see it was updated correctly
        expect(updatedReport.id).toBe(report.id)
        expect(updatedReport.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['harry', 'spongebob']))
        expect(updatedReport.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/04/2022', '06/06/2022']))
      })

      it('handles recipient notes being updated', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [{ note: 'i am groot' }, { note: 'harry' }],
          recipientNextSteps: [
            { note: 'One Piece', completeDate: '06/01/2022' },
            { note: 'Toy Story', completeDate: '06/02/2022' },
          ],
        }
        const report = await ActivityReport.create(reportWithNotes)

        // When the report is updated with new set of recipient notes
        const notes = {
          recipientNextSteps: [
            { note: 'One Piece', completeDate: '06/04/2022' },
            { note: 'spongebob', completeDate: '06/06/2022' },
          ],
        }
        const updatedReport = await createOrUpdate(notes, report)

        // Then we see it was updated correctly
        expect(updatedReport.id).toBe(report.id)
        expect(updatedReport.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'spongebob']))
        expect(updatedReport.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/04/2022', '06/06/2022']))
      })

      it('handles notes being updated to empty', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [
            { note: 'i am groot', completeDate: '06/01/2022' },
            { note: 'harry', completeDate: '06/02/2022' },
          ],
          recipientNextSteps: [
            { note: 'One Piece', completeDate: '06/02/2022' },
            { note: 'Toy Story', completeDate: '06/04/2022' },
          ],
        }
        const report = await ActivityReport.create(reportWithNotes)

        // When the report is updated with empty notes
        const notes = {
          recipientNextSteps: [],
          specialistNextSteps: [],
        }
        const updatedReport = await createOrUpdate(notes, report)

        // Then we see the report was updated correctly
        expect(updatedReport.id).toBe(report.id)
        expect(updatedReport.recipientNextSteps.length).toBe(1)
        expect(updatedReport.recipientNextSteps).toEqual([{ dataValues: { note: '' } }])
        expect(updatedReport.specialistNextSteps.length).toBe(1)
        expect(updatedReport.specialistNextSteps).toEqual([{ dataValues: { note: '' } }])
      })

      it('handles notes being the same', async () => {
        // Given a report with some notes
        const reportWithNotes = {
          ...reportObject,
          specialistNextSteps: [
            { note: 'i am groot', completeDate: '06/01/2022' },
            { note: 'harry', completeDate: '06/02/2022' },
          ],
          recipientNextSteps: [
            { note: 'One Piece', completeDate: '06/03/2022' },
            { note: 'Toy Story', completeDate: '06/04/2022' },
          ],
        }
        const report = await createOrUpdate(reportWithNotes)
        const recipientIds = report.recipientNextSteps.map((note) => note.id)
        const specialistsIds = report.specialistNextSteps.map((note) => note.id)

        const [freshlyUpdated] = await activityReportAndRecipientsById(report.id)

        // When the report is updated with same notes
        const notes = {
          specialistNextSteps: report.specialistNextSteps,
          recipientNextSteps: report.recipientNextSteps,
        }
        const updatedReport = await createOrUpdate(notes, freshlyUpdated)

        // Then we see nothing changes
        // And we are re-using the same old ids
        expect(updatedReport.id).toBe(report.id)
        expect(updatedReport.recipientNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['One Piece', 'Toy Story']))
        expect(updatedReport.recipientNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/03/2022', '06/04/2022']))
        expect(updatedReport.recipientNextSteps.map((n) => n.id)).toEqual(expect.arrayContaining(recipientIds))

        expect(updatedReport.specialistNextSteps.map((n) => n.note)).toEqual(expect.arrayContaining(['i am groot', 'harry']))
        expect(updatedReport.specialistNextSteps.map((n) => n.completeDate)).toEqual(expect.arrayContaining(['06/01/2022', '06/02/2022']))
        expect(updatedReport.specialistNextSteps.map((n) => n.id)).toEqual(expect.arrayContaining(specialistsIds))
      })

      it('calls syncApprovers appropriately', async () => {
        const reportWithApprovers = {
          ...reportObject,
          approverUserIds: [mockUserTwo.id],
        }
        // Calls syncApprovers when approverUserIds is present
        const newReport = await createOrUpdate(reportWithApprovers)
        expect(newReport.approvers[0].user.id).toEqual(mockUserTwo.id)

        const [report] = await activityReportAndRecipientsById(newReport.id)

        // When syncApprovers is undefined, skip call, avoid removing approvers
        const reportTwo = await createOrUpdate({ ...reportObject, regionId: 3 }, report)
        expect(reportTwo.approvers[0].user.id).toEqual(mockUserTwo.id)
        expect(reportTwo.regionId).toEqual(3)
      })

      it('works when no collaborator user roles (branch coverage)', async () => {
        const report = await createOrUpdate({
          ...reportObject,
          activityReportCollaborators: [{ user: { id: mockUser.id } }],
        })
        expect(report.activityReportCollaborators.length).toBe(1)
        expect(report.activityReportCollaborators[0].user.id).toBe(mockUser.id)
      })
    })

    describe('activityReportByLegacyId', () => {
      it('returns the report with the legacyId', async () => {
        const report = await ActivityReport.create({ ...reportObject, legacyId: 'legacy' })
        const found = await activityReportByLegacyId('legacy')
        expect(found.id).toBe(report.id)
      })
    })

    describe('activityReportAndRecipientsById', () => {
      it('retrieves an activity report', async () => {
        const report = await ActivityReport.create(reportObject)

        const [foundReport] = await activityReportAndRecipientsById(report.id)
        expect(foundReport.id).toBe(report.id)
        expect(foundReport.ECLKCResourcesUsed).toEqual(['test'])
      })
      it('includes approver with full name', async () => {
        const report = await ActivityReport.create({ ...submittedReport, regionId: 5 })
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockUserTwo.id,
          status: APPROVER_STATUSES.APPROVED,
          note: 'great job from user 2',
        })
        const [foundReport] = await activityReportAndRecipientsById(report.id)
        expect(foundReport.approvers[0].user.get('fullName')).toEqual(`${mockUserTwo.name}, COR`)
      })
      it('includes recipient with programs', async () => {
        const recipientWithProgram = await Recipient.create({
          id: RECIPIENT_WITH_PROGRAMS_ID,
          name: 'recipient with program',
          uei: 'NNA5N2KHMGM2',
        })
        const grantWithProgram = await Grant.create({
          id: RECIPIENT_WITH_PROGRAMS_ID,
          number: 'recipgrantnumber695',
          recipientId: recipientWithProgram.id,
          startDate: new Date(),
          endDate: new Date(),
        })

        const report = await ActivityReport.create({
          ...submittedReport,
          regionId: 5,
          activityRecipients: [{ grantId: grantWithProgram.id }],
        })

        await ActivityRecipient.create({
          activityReportId: report.id,
          grantId: grantWithProgram.id,
        })

        await Program.create({
          id: 585,
          grantId: grantWithProgram.id,
          name: 'type2',
          programType: 'EHS',
          startYear: 'Aeons ago',
          status: 'active',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2025-01-01'),
        })

        await Program.create({
          id: 586,
          grantId: grantWithProgram.id,
          name: 'type',
          programType: 'HS',
          startYear: 'The murky depths of time',
          status: 'active',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2025-01-01'),
        })

        expect(recipientWithProgram.name).toBe('recipient with program')
        const createdGrant = await Grant.findOne({ where: { number: 'recipgrantnumber695' } })
        expect(createdGrant.name).toBe('recipient with program - recipgrantnumber695')
        const [foundReport, activityRecipients] = await activityReportAndRecipientsById(report.id)
        expect(foundReport).not.toBeNull()
        expect(activityRecipients.length).toBe(1)
        expect(activityRecipients[0].name).toBe('recipient with program - recipgrantnumber695 - EHS, HS')
      })
      it('excludes soft deleted approvers', async () => {
        // To include deleted approvers in future add paranoid: false
        // attribute to include object for ActivityReportApprover
        // https://sequelize.org/master/manual/paranoid.html#behavior-with-other-queries
        const report = await ActivityReport.create(submittedReport)
        // Create needs_action approver
        const toDeleteApproval = await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockUserTwo.id,
          status: APPROVER_STATUSES.NEEDS_ACTION,
          note: 'change x, y, z',
        })
        // Create approved approver
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: mockUserThree.id,
          status: APPROVER_STATUSES.APPROVED,
          note: 'great job',
        })
        // Soft delete needs_action approver
        await ActivityReportApprover.destroy({
          where: { id: toDeleteApproval.id },
          individualHooks: true,
        })
        const [foundReport] = await activityReportAndRecipientsById(report.id)
        // Show both approvers
        expect(foundReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED)
        expect(foundReport.approvers.length).toEqual(1)
        expect(foundReport.approvers[0]).toEqual(
          expect.objectContaining({
            note: 'great job',
            status: APPROVER_STATUSES.APPROVED,
          })
        )
      })
    })

    describe('activityReports retrieval and sorting', () => {
      let latestReport
      let firstGrant

      beforeAll(async () => {
        const topicsOne = ['topic d', 'topic c']
        const topicsTwo = ['topic b', 'topic a']
        const firstRecipient = await Recipient.create({
          id: RECIPIENT_ID_SORTING,
          name: 'aaaa',
          uei: 'NNA5N2KHMGM2',
        })
        firstGrant = await Grant.create({
          id: RECIPIENT_ID_SORTING,
          number: 'anumber',
          recipientId: firstRecipient.id,
          startDate: new Date(),
          endDate: new Date(),
        })

        await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          userId: mockUserTwo.id,
          topics: topicsOne,
        })
        await createOrUpdate({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          activityReportCollaborators: [{ user: { id: mockUser.id } }],
        })
        await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          regionId: 2,
        })
        const report = await ActivityReport.create({
          ...submittedReport,
          activityRecipients: [{ grantId: firstGrant.id }],
          calculatedStatus: REPORT_STATUSES.APPROVED,
          topics: topicsTwo,
        })
        try {
          await ActivityRecipient.create({
            activityReportId: report.id,
            grantId: firstGrant.id,
          })
        } catch (error) {
          auditLogger.error(JSON.stringify(error))
          throw error
        }
        latestReport = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          updatedAt: '1900-01-01T12:00:00Z',
        })
        await ActivityReport.create({
          ...submittedReport,
          status: REPORT_STATUSES.APPROVED,
          startDate: '2020-08-31T12:00:00Z',
          endDate: '2020-08-31T12:00:00Z',
          topics: topicsTwo,
        })
      })

      it('retrieves reports when directly provided with IDS', async () => {
        const { count, rows } = await activityReports({ 'region.in': ['1'], 'reportId.nctn': idsToExclude }, false, 0, [latestReport.id])
        expect(rows.length).toBe(1)
        expect(count).toBeDefined()
        expect(rows[0].id).toBe(latestReport.id)
      })

      it('retrieves reports with default sort by updatedAt', async () => {
        const { count, rows } = await activityReports({
          'region.in': ['1'],
          'reportId.nctn': idsToExclude,
        })
        expect(rows.length).toBe(5)
        expect(count).toBeDefined()
        expect(rows[0].id).toBe(latestReport.id)
      })

      it('retrieves reports sorted by author', async () => {
        reportObject.userId = mockUserTwo.id

        const { rows } = await activityReports({
          sortBy: 'author',
          sortDir: 'asc',
          offset: 0,
          limit: 2,
          'region.in': ['1'],
          'reportId.nctn': idsToExclude,
        })
        expect(rows.length).toBe(2)
        expect(rows[0].author.name).toBe(mockUser.name)
      })

      it('retrieves reports sorted by collaborators', async () => {
        await ActivityReport.create(reportObject)

        const { rows } = await activityReports({
          sortBy: 'collaborators',
          sortDir: 'asc',
          offset: 0,
          limit: 12,
          'region.in': ['1'],
          'reportId.nctn': idsToExclude,
        })
        expect(rows.length).toBe(5)
        expect(rows[0].activityReportCollaborators[0].user.name).toBe(mockUser.name)
      })

      it('retrieves reports sorted by id', async () => {
        await ActivityReport.create({ ...reportObject, regionId: 1 })

        const { rows } = await activityReports({
          sortBy: 'regionId',
          sortDir: 'desc',
          offset: 0,
          limit: 12,
          'region.in': ['1', '2'],
          'reportId.nctn': idsToExclude,
        })
        expect(rows.length).toBe(6)
        expect(rows[0].regionId).toBe(2)
      })

      it('retrieves reports sorted by activity recipients', async () => {
        const { rows, recipients } = await activityReports({
          sortBy: 'activityRecipients',
          sortDir: 'asc',
          offset: 0,
          limit: 12,
          'region.in': ['1', '2'],
          'reportId.nctn': idsToExclude,
        })

        expect(rows.length).toBe(6)

        expect(rows[0].id).toBe(recipients[0].activityReportId)
      })

      it('retrieves reports sorted by sorted topics', async () => {
        await ActivityReport.create(reportObject)
        await ActivityReport.create(reportObject)

        const { rows } = await activityReports({
          sortBy: 'topics',
          sortDir: 'asc',
          offset: 0,
          limit: 12,
          'region.in': ['1', '2'],
          'reportId.nctn': idsToExclude,
        })
        expect(rows.length).toBe(6)
        expect(rows[0].sortedTopics[0]).toBe('topic a')
        expect(rows[0].sortedTopics[1]).toBe('topic b')
        expect(rows[1].sortedTopics[0]).toBe('topic c')
        expect(rows[0].topics[0]).toBe('topic a')
        expect(rows[0].topics[1]).toBe('topic b')
        expect(rows[1].topics[0]).toBe('topic c')
      })
    })

    describe('possibleRecipients', () => {
      it('retrieves correct recipients in region', async () => {
        const region = 19
        const recipients = await possibleRecipients(region)
        expect(recipients.grants.length).toBe(1)

        // Get the grant with the id ALERT_RECIPIENT_ID.
        const alertRecipient = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === RECIPIENT_ID)
        expect(alertRecipient.length).toBe(1)

        // Get the grant with the id inactiveGrantIdOne.
        const inactiveRecipient = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === INACTIVE_GRANT_ID_ONE)
        expect(inactiveRecipient.length).toBe(1)
      })

      it('retrieves no recipients in empty region', async () => {
        const region = 100
        const recipients = await possibleRecipients(region)

        expect(recipients.grants.length).toBe(0)
      })

      it('retrieves inactive grant inside of range with report', async () => {
        const region = 19
        const recipients = await possibleRecipients(region, inactiveActivityReportOne.id)
        expect(recipients.grants.length).toBe(1)

        // Get the grant with the id RECIPIENT_ID.
        const alertRecipient = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === RECIPIENT_ID)
        expect(alertRecipient.length).toBe(1)

        // Get the grant with the id inactiveGrantIdOne.
        const inactiveRecipient = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === INACTIVE_GRANT_ID_ONE)
        expect(inactiveRecipient.length).toBe(1)
      })

      it("doesn't retrieve inactive grant outside of range with report", async () => {
        const region = 19
        const recipients = await possibleRecipients(region, inactiveActivityReportTwo.id)
        expect(recipients.grants.length).toBe(1)
        expect(recipients.grants[0].grants.length).toBe(1)

        // Get the grant with the id RECIPIENT_ID.
        const alertRecipient = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === RECIPIENT_ID)
        expect(alertRecipient.length).toBe(1)
      })

      it('retrieves inactive grant inside of range with report missing start date', async () => {
        const region = 19
        // eslint-disable-next-line max-len
        const recipients = await possibleRecipients(region, inactiveActivityReportMissingStartDate.id)
        expect(recipients.grants.length).toBe(1)
        expect(recipients.grants[0].grants.length).toBe(3)

        // Get the grant with the id RECIPIENT_ID.
        const alertRecipient = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === RECIPIENT_ID)
        expect(alertRecipient.length).toBe(1)

        // Get the grant with the id INACTIVE_GRANT_ID_ONE.
        const inactiveGrantOne = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === INACTIVE_GRANT_ID_ONE)
        expect(inactiveGrantOne.length).toBe(1)

        // Get the grant with the id INACTIVE_GRANT_ID_THREE (todays date).
        const inactiveGrantThree = recipients.grants[0].grants.filter((grant) => grant.dataValues.activityRecipientId === INACTIVE_GRANT_ID_THREE)
        expect(inactiveGrantThree.length).toBe(1)
      })
    })

    describe('getAllDownloadableActivityReports', () => {
      let approvedReport
      let legacyReport
      let nonApprovedReport

      beforeAll(async () => {
        const mockLegacyReport = {
          ...submittedReport,
          imported: { foo: 'bar' },
          legacyId: 'R14-AR-123456',
          regionId: 14,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        }
        const mockReport = {
          ...submittedReport,
          regionId: 14,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        }
        // Recipient and Grant.
        const downloadRecipient = await Recipient.create({
          id: DOWNLOAD_RECIPIENT_WITH_PROGRAMS_ID,
          name: 'download recipient with program',
          uei: 'DNA5N2KHMGM2',
        })
        const downloadGrant = await Grant.create({
          id: DOWNLOAD_RECIPIENT_WITH_PROGRAMS_ID,
          number: 'downloadgrantnumber695',
          recipientId: downloadRecipient.id,
          startDate: new Date(),
          endDate: new Date(),
        })

        // create two approved
        approvedReport = await ActivityReport.create({
          ...mockReport,
          activityRecipients: [{ grantId: downloadGrant.id }],
        })
        await ActivityReportApprover.create({
          activityReportId: approvedReport.id,
          userId: mockUserTwo.id,
          status: APPROVER_STATUSES.APPROVED,
        })
        await ActivityReport.create(mockReport)

        await ActivityRecipient.create({
          activityReportId: approvedReport.id,
          grantId: downloadGrant.id,
        })

        await Program.create({
          id: 587,
          grantId: downloadGrant.id,
          name: 'type3',
          programType: 'DWN',
          startYear: 'Aeons ago',
          status: 'active',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2025-01-01'),
        })

        // create one approved legacy
        legacyReport = await ActivityReport.create(mockLegacyReport)
        // create one submitted
        nonApprovedReport = await ActivityReport.create({
          ...mockReport,
          calculatedStatus: REPORT_STATUSES.SUBMITTED,
        })
      })

      it('returns all approved reports', async () => {
        const rows = await getAllDownloadableActivityReports([14])
        const ids = rows.map((row) => row.id)
        expect(ids.length).toEqual(4)
        expect(ids).toContain(approvedReport.id)
        expect(ids).toContain(legacyReport.id)

        const foundApprovedReports = rows.filter((r) => r.id === approvedReport.id)
        expect(foundApprovedReports.length).toBe(1)
        expect(foundApprovedReports[0].activityRecipients[0].name).toBe('download recipient with program - downloadgrantnumber695 - DWN')
      })

      it('returns all approved reports when provided with IDs', async () => {
        const rows = await getAllDownloadableActivityReports([14], {}, 0, [approvedReport.id])
        const ids = rows.map((row) => row.id)
        expect(ids.length).toEqual(1)
        expect(ids).toContain(approvedReport.id)
      })

      it('coerces single report id params into an array', async () => {
        const rows = await getAllDownloadableActivityReports('14', {}, 0, `${approvedReport.id}`)
        const ids = rows.map((row) => row.id)
        expect(ids.length).toEqual(1)
        expect(ids).toContain(approvedReport.id)
      })

      it('will return legacy reports', async () => {
        const rows = await getAllDownloadableActivityReports([14], {}, true)
        const ids = rows.map((row) => row.id)
        expect(ids).toContain(legacyReport.id)

        const secondResult = await getDownloadableActivityReportsByIds([14], { report: [legacyReport.id] }, true)

        expect(secondResult.length).toEqual(1)
        expect(secondResult[0].id).toEqual(legacyReport.id)
      })

      it('excludes non-approved reports', async () => {
        const rows = await getAllDownloadableActivityReports([14])
        const ids = rows.map((row) => row.id)
        expect(ids).not.toContain(nonApprovedReport.id)
      })
    })

    describe('getAllDownloadableActivityReportAlerts', () => {
      let report

      beforeAll(async () => {
        const mockSubmittedReport = {
          ...submittedReport,
          regionId: 14,
          userId: alertsMockUserOne.id,
        }
        const mockNeedsActionReport = {
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
          regionId: 14,
          userId: alertsMockUserTwo.id,
        }
        await ActivityReport.create(mockSubmittedReport)
        report = await ActivityReport.create(mockNeedsActionReport)
      })

      // eslint-disable-next-line jest/no-disabled-tests
      it('do not alert for submitted reports', async () => {
        const rows = await getAllDownloadableActivityReportAlerts(alertsMockUserOne.id)
        expect(rows.length).toEqual(0) // fails, rcvd 13
      })
      // eslint-disable-next-line jest/no-disabled-tests
      it('returns all reports that need action', async () => {
        const rows = await getAllDownloadableActivityReportAlerts(alertsMockUserTwo.id)
        const ids = rows.map((row) => row.id)

        expect(ids.length).toEqual(1) // fails, rcvd 6
        expect(ids).toContain(report.id)
      })
    })

    describe('getDownloadableActivityReportsByIds', () => {
      it('returns report when passed a single report id', async () => {
        const mockReport = {
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        }
        const report = await ActivityReport.create(mockReport)
        const rows = await getDownloadableActivityReportsByIds([1], { report: report.id })

        expect(rows.length).toEqual(1)
        expect(rows[0].id).toEqual(report.id)
      })

      it('includes legacy reports', async () => {
        const mockLegacyReport = {
          ...reportObject,
          imported: { foo: 'bar' },
          legacyId: 'R14-AR-abc123',
          calculatedStatus: REPORT_STATUSES.APPROVED,
        }
        const legacyReport = await ActivityReport.create(mockLegacyReport)

        const mockReport = {
          ...submittedReport,
        }
        const report = await ActivityReport.create(mockReport)

        const rows = await getDownloadableActivityReportsByIds([1], {
          report: [report.id, legacyReport.id],
        })

        expect(rows.length).toEqual(2)
        expect(rows.map((row) => row.id)).toContain(legacyReport.id)
      })

      it('ignores invalid report ids', async () => {
        const mockReport = {
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        }
        const report = await ActivityReport.create(mockReport)

        const rows = await getDownloadableActivityReportsByIds([1], {
          report: [report.id, 'invalidIdentifier'],
        })

        expect(rows.length).toEqual(1)
        expect(rows[0].id).toEqual(report.id)
      })
    })
    describe('setStatus', () => {
      it('sets report to draft', async () => {
        const report = await ActivityReport.create(submittedReport)
        expect(report.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED)
        await setStatus(report, REPORT_STATUSES.DRAFT)
        // get report again so we're checking that the change is persisted to the database
        const updatedReport = await ActivityReport.findOne({ where: { id: report.id } })
        expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.DRAFT)
        expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT)
      })
    })
  })

  describe('batchQuery', () => {
    const reports = []

    beforeAll(async () => {
      const activityRecipients = [{ grantId: 10000 }]
      reports.push(await createReport({ activityRecipients }))
      reports.push(await createReport({ activityRecipients }))
      reports.push(await createReport({ activityRecipients }))
    })

    afterAll(async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const r of reports) {
        // eslint-disable-next-line no-await-in-loop
        await destroyReport(r)
      }
    })

    it('handles results with less items then the limit', async () => {
      const ids = reports.map((r) => r.id)
      ids.sort()
      const where = {
        id: ids,
      }

      const res = await batchQuery({ where }, 100)
      const resIds = res.map((r) => r.id)
      resIds.sort()
      expect(resIds).toEqual(ids)
    })

    it('handles results with more items then the limit', async () => {
      const ids = reports.map((r) => r.id)
      ids.sort()
      const where = {
        id: ids,
      }

      const res = await batchQuery({ where }, 1)
      const resIds = res.map((r) => r.id)
      resIds.sort()
      expect(resIds).toEqual(ids)
    })
  })

  describe('digests', () => {
    describe('activityReportsWhereCollaboratorByDate', () => {
      beforeEach(async () => {
        await User.create(digestMockCollabOne, { validate: false }, { individualHooks: false })
        await User.create(mockUser, { validate: false }, { individualHooks: false })
      })
      afterEach(async () => {
        await ActivityReportCollaborator.destroy({ where: { userId: digestMockCollabOne.id } })
        await ActivityReport.destroy({ where: { userId: mockUser.id } })
        await User.destroy({ where: { id: digestMockCollabOne.id } })
        await User.destroy({ where: { id: mockUser.id } })
      })
      it('retrieves activity reports in DRAFT when added as a collaborator', async () => {
        const report = await ActivityReport.create({
          ...reportObject,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          lastUpdatedById: mockUser.id,
          userId: mockUser.id,
        })
        const empty = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeDefined()
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(dailyDigestReport).toBeDefined()
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(dailyDigestReport).toBeDefined()
        expect(monthlyDigestReport.id).toBe(report.id)
      })
      it('retrieves activity reports (SUBMITTED) when added as a collaborator', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.SUBMITTED,
        })
        const empty = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport.id).toBe(report.id)
      })
      it('retrieves activity reports (NEEDS_ACTION) when added as a collaborator', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        })

        const empty = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport.id).toBe(report.id)
      })

      it('does not retrieve activity reports (APPROVED) when added as a collaborator', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        })
        const empty = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsWhereCollaboratorByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
      })
    })

    describe('activityReportsChangesRequestedByDate', () => {
      beforeEach(async () => {
        await User.create(digestMockCollabOne, { validate: false }, { individualHooks: false })
        await User.create(mockUser, { validate: false }, { individualHooks: false })
      })
      afterEach(async () => {
        await ActivityReportCollaborator.destroy({ where: { userId: digestMockCollabOne.id } })
        await ActivityReport.destroy({ where: { userId: mockUser.id } })
        await User.destroy({ where: { id: digestMockCollabOne.id } })
        await User.destroy({ where: { id: mockUser.id } })
      })
      it('retrieves daily activity reports in DRAFT when changes requested', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        })
        await report.update({ calculatedStatus: REPORT_STATUSES.DRAFT }, { individualHooks: true })
        const empty = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeDefined()
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(dailyDigestReport).toBeDefined()
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(dailyDigestReport).toBeDefined()
        expect(monthlyDigestReport.id).toBe(report.id)
        // Check author
        const [authorDigest] = await activityReportsChangesRequestedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeDefined()
        expect(authorDigest.id).toBe(report.id)
      })
      it('retrieves activity reports (SUBMITTED) when changes requested', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        })
        await report.update({ calculatedStatus: REPORT_STATUSES.SUBMITTED }, { individualHooks: true })
        const empty = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport.id).toBe(report.id)
        // Check author
        const [authorDigest] = await activityReportsChangesRequestedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeDefined()
        expect(authorDigest.id).toBe(report.id)
      })
      it('retrieves activity reports (NEEDS_ACTION) when changes requested', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        })

        const empty = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport.id).toBe(report.id)
        // Check author
        const [authorDigest] = await activityReportsChangesRequestedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeDefined()
        expect(authorDigest.id).toBe(report.id)
      })

      it('does not retrieve activity reports (APPROVED) when changes requested', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        })
        await report.update({ calculatedStatus: REPORT_STATUSES.APPROVED }, { individualHooks: true })
        const empty = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsChangesRequestedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
        // Check author
        const [authorDigest] = await activityReportsChangesRequestedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeUndefined()
      })
    })

    describe('activityReportsSubmittedByDate', () => {
      beforeEach(async () => {
        await User.create(digestMockApprover, { validate: false }, { individualHooks: false })
        await User.create(mockUser, { validate: false }, { individualHooks: false })
      })
      afterEach(async () => {
        await ActivityReportApprover.destroy({
          where: { userId: digestMockApprover.id },
          force: true,
        })
        await ActivityReport.destroy({ where: { userId: mockUser.id } })
        await User.destroy({ where: { id: digestMockApprover.id } })
        await User.destroy({ where: { id: mockUser.id } })
      })
      it('does not retrieve activity reports in DRAFT when submitted', async () => {
        const report = await ActivityReport.create(submittedReport)

        const empty = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Approver.
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: digestMockApprover.id,
        })
        // Change to Draft
        await report.update({ calculatedStatus: REPORT_STATUSES.DRAFT }, { individualHooks: true })
        const test = await ActivityReport.findOne({ where: { id: report.id } })
        expect(test.calculatedStatus).toBe('draft')
        const [dailyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
      })
      it('retrieves activity reports (SUBMITTED) when submitted', async () => {
        const report = await ActivityReport.create(submittedReport)

        const empty = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Approver.
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: digestMockApprover.id,
        })

        const [dailyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport.id).toBe(report.id)
      })
      it('retrieves activity reports (NEEDS_ACTION) when submitted', async () => {
        const report = await ActivityReport.create(submittedReport)

        const empty = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Approver.
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: digestMockApprover.id,
        })
        // Change to needs action
        await report.update({ calculatedStatus: REPORT_STATUSES.NEEDS_ACTION }, { individualHooks: true })
        const [dailyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport.id).toBe(report.id)
      })

      it('does not retrieve activity reports (APPROVED) when submitted', async () => {
        const report = await ActivityReport.create(submittedReport)

        const empty = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Approver.
        await ActivityReportApprover.create({
          activityReportId: report.id,
          userId: digestMockApprover.id,
        })
        // Change to approved
        await report.update({ calculatedStatus: REPORT_STATUSES.APPROVED }, { individualHooks: true })
        const [dailyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsSubmittedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
      })
    })

    describe('activityReportsApprovedByDate', () => {
      beforeEach(async () => {
        await User.create(digestMockCollabOne, { validate: false }, { individualHooks: false })
        await User.create(mockUser, { validate: false }, { individualHooks: false })
      })
      afterEach(async () => {
        await ActivityReportCollaborator.destroy({
          where: { userId: digestMockCollabOne.id },
          force: true,
        })
        await ActivityReport.destroy({ where: { userId: mockUser.id } })
        await User.destroy({ where: { id: digestMockCollabOne.id } })
        await User.destroy({ where: { id: mockUser.id } })
      })
      it('does not retrieve activity reports in DRAFT when approved', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        })

        const empty = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })
        // Change to Draft
        await report.update({ calculatedStatus: REPORT_STATUSES.DRAFT }, { individualHooks: true })
        const test = await ActivityReport.findOne({ where: { id: report.id } })
        expect(test.calculatedStatus).toBe('draft')
        const [dailyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
        // Check author
        const [authorDigest] = await activityReportsApprovedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeUndefined()
      })
      it('does not retrieve activity reports (SUBMITTED) when approved', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        })

        const empty = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })
        // Change to Submitted
        await report.update({ calculatedStatus: REPORT_STATUSES.SUBMITTED }, { individualHooks: true })
        const [dailyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
        // Check author
        const [authorDigest] = await activityReportsApprovedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeUndefined()
      })
      it('does not retrieve activity reports (NEEDS_ACTION) when approved', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        })

        const empty = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })
        // Change to Needs action
        await report.update({ calculatedStatus: REPORT_STATUSES.NEEDS_ACTION }, { individualHooks: true })
        const [dailyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeUndefined()
        const [weeklyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(weeklyDigestReport).toBeUndefined()
        const [monthlyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(monthlyDigestReport).toBeUndefined()
        // Check author
        const [authorDigest] = await activityReportsApprovedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeUndefined()
      })

      it('retrieves activity reports (APPROVED) when approved', async () => {
        const report = await ActivityReport.create({
          ...submittedReport,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        })

        const empty = await activityReportsApprovedByDate(digestMockApprover.id, "NOW() - INTERVAL '1 DAY'")
        expect(empty.length).toBe(0)
        // Add Collaborator.
        await ActivityReportCollaborator.create({
          activityReportId: report.id,
          userId: digestMockCollabOne.id,
        })

        const [dailyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 DAY'")
        expect(dailyDigestReport).toBeDefined()
        expect(dailyDigestReport.id).toBe(report.id)
        const [weeklyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 WEEK'")
        expect(dailyDigestReport).toBeDefined()
        expect(weeklyDigestReport.id).toBe(report.id)
        const [monthlyDigestReport] = await activityReportsApprovedByDate(digestMockCollabOne.id, "NOW() - INTERVAL '1 MONTH'")
        expect(dailyDigestReport).toBeDefined()
        expect(monthlyDigestReport.id).toBe(report.id)
        // Check author
        const [authorDigest] = await activityReportsApprovedByDate(mockUser.id, "NOW() - INTERVAL '1 DAY'")
        expect(authorDigest).toBeDefined()
        expect(authorDigest.id).toBe(report.id)
      })
    })
  })
  describe('handleSoftDeleteReport', () => {
    let user
    let report
    let alternateReport
    let unrelatedReport
    let recipient
    let grant
    let goal
    let alternateGoal
    let unrelatedGoal

    beforeAll(async () => {
      user = await User.create({
        ...mockUserFour,
        hsesUserId: faker.datatype.string(10),
        id: faker.datatype.number({ min: 90000 }),
      })
      recipient = await createRecipient({})
      grant = await createGrant({ recipientId: recipient.id })

      report = await ActivityReport.create({
        ...submittedReport,
        userId: user.id,
        lastUpdatedById: user.id,
        submissionStatus: REPORT_STATUSES.APPROVED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [{ activityRecipientId: grant.id }],
      })
      alternateReport = await ActivityReport.create({
        ...submittedReport,
        userId: user.id,
        lastUpdatedById: user.id,
        submissionStatus: REPORT_STATUSES.APPROVED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [{ activityRecipientId: grant.id }],
      })
      unrelatedReport = await ActivityReport.create({
        ...submittedReport,
        userId: user.id,
        lastUpdatedById: user.id,
        submissionStatus: REPORT_STATUSES.APPROVED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [{ activityRecipientId: grant.id }],
      })
      unrelatedGoal = await Goal.create({
        name: 'Unrelated Goal',
        createdVia: 'activityReport',
        grantId: grant.id,
        status: GOAL_STATUS.NOT_STARTED,
      })
      goal = await Goal.create({
        name: 'Test Goal',
        createdVia: 'activityReport',
        grantId: grant.id,
        status: GOAL_STATUS.NOT_STARTED,
      })
      alternateGoal = await Goal.create({
        name: 'Test Alternate Goal',
        createdVia: 'activityReport',
        grantId: grant.id,
        status: GOAL_STATUS.NOT_STARTED,
      })
      await Objective.create({
        title: 'Test Objective',
        goalId: goal.id,
        status: GOAL_STATUS.NOT_STARTED,
      })
      await ActivityReportGoal.create({
        activityReportId: unrelatedReport.id,
        goalId: unrelatedGoal.id,
      })
      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      })
      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: alternateGoal.id,
      })
      await ActivityReportGoal.create({
        activityReportId: alternateReport.id,
        goalId: alternateGoal.id,
      })
    })

    afterAll(async () => {
      const reports = [report.id, alternateReport.id, unrelatedReport.id]
      const goals = [goal.id, alternateGoal.id, unrelatedGoal.id]
      await ActivityReportGoal.destroy({
        where: {
          activityReportId: reports,
        },
      })
      await Objective.destroy({ where: { goalId: goals }, force: true })
      await Goal.destroy({ where: { id: goals }, force: true })
      await ActivityReport.unscoped().destroy({ where: { id: reports }, force: true })
      // await ActivityReport.unscoped().destroy({ where: { userId: user.id }, force: true });
      await Grant.destroy({ where: { id: grant.id }, force: true, individualHooks: true })
      await Recipient.destroy({ where: { id: recipient.id }, force: true })
      await User.destroy({ where: { id: user.id }, force: true })
    })

    it('soft deletes goals and objectives associated with the report', async () => {
      expect(report.submissionStatus).toBe(REPORT_STATUSES.APPROVED)
      await handleSoftDeleteReport(report)

      const objs = await Objective.findAll({
        where: { goalId: [goal.id, alternateGoal.id] },
        paranoid: false,
      })
      const gls = await Goal.findAll({
        where: { id: [goal.id, alternateGoal.id] },
        paranoid: false,
      })

      expect(report.submissionStatus).toBe(REPORT_STATUSES.DELETED)
      expect(objs.length).toBe(1)
      const deletedObjectives = objs.filter((o) => o.deletedAt !== null)
      expect(deletedObjectives.length).toBe(1)
      const [deletedObjective] = deletedObjectives
      expect(deletedObjective.goalId).toBe(goal.id)
      expect(gls.length).toBe(2)
      const deletedGoals = gls.filter((g) => g.deletedAt !== null)
      expect(deletedGoals.length).toBe(1)
      const [deletedGoal] = deletedGoals
      expect(deletedGoal.id).toBe(goal.id)

      const unrelated = await Goal.findByPk(unrelatedGoal.id, { paranoid: false })
      expect(unrelated).not.toBeNull()
      expect(unrelated.deletedAt).toBeNull()
    })
  })
})
