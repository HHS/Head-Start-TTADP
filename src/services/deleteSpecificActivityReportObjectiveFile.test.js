/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker'
import { REPORT_STATUSES } from '@ttahub/common'
import { FILE_STATUSES } from '../constants'
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  User,
  ActivityReportObjectiveFile,
  File,
} from '../models'
import { deleteSpecificActivityReportObjectiveFile } from './files'

jest.mock('bull')

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user1134265161',
  hsesUsername: 'user1134265161',
  hsesUserId: 'user1134265161',
  lastLogin: new Date(),
}

const report = {
  regionId: 1,
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
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
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  objectivesWithoutGoals: [],
  goals: [],
  version: 2,
}

describe('deleteSpecificActivityReportObjectiveFile', () => {
  afterEach(async () => {
    jest.clearAllMocks()
  })

  let grant
  let file
  let activityReport1
  let activityReport2
  let user
  let recipient
  let goal
  let objective
  let aro1
  let aro2

  let arof1
  let arof2

  const mockGrant = {
    id: faker.datatype.number(),
    number: faker.random.alphaNumeric(5),
    cdi: false,
    regionId: 1,
    startDate: new Date(),
    endDate: new Date(),
  }

  beforeAll(async () => {
    // User.
    user = await User.create(mockUser)

    // Recipient.
    recipient = await Recipient.create({
      name: 'recipient',
      id: faker.datatype.number(),
      uei: faker.datatype.string(12),
    })

    // Grant.
    grant = await Grant.create({ ...mockGrant, recipientId: recipient.id })

    // File.
    file = await File.create({
      originalFileName: 'specific-delete.txt',
      key: 'specific-delete.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    })

    // Recipient Reports.
    activityReport1 = await ActivityReport.create({
      ...report,
      userId: user.id,
      lastUpdatedById: user.id,
      activityRecipients: { activityRecipientId: recipient.id },
    })

    activityReport2 = await ActivityReport.create({
      ...report,
      userId: user.id,
      lastUpdatedById: user.id,
      activityRecipients: { activityRecipientId: recipient.id },
    })

    // Goal.
    goal = await Goal.create({
      name: 'Goal shared between two reports',
      status: 'In Progress',
      grantId: grant.id,
    })

    // Objective.
    objective = await Objective.create({
      title: 'Objective shared between two reports',
      goalId: goal.id,
      status: 'Not Started',
    })

    // Activity Report Goal (two reports).
    await ActivityReportGoal.create({
      activityReportId: activityReport1.id,
      goalId: goal.id,
      name: 'Goal shared between two reports 1',
    })

    await ActivityReportGoal.create({
      activityReportId: activityReport2.id,
      goalId: goal.id,
      name: 'Goal shared between two reports 2',
    })

    // Activity Report Objective (two reports).
    aro1 = await ActivityReportObjective.create({
      activityReportId: activityReport1.id,
      objectiveId: objective.id,
      title: 'Objective shared between two reports 1',
      ttaProvided: 'Objective shared between two reports tta 1',
      status: 'Complete',
    })

    aro2 = await ActivityReportObjective.create({
      activityReportId: activityReport2.id,
      objectiveId: objective.id,
      title: 'Objective shared between two reports 2',
      ttaProvided: 'Objective shared between two reports tta 2',
      status: 'Complete',
    })

    // Activity Report Objective File (two reports).
    arof1 = await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: aro1.id,
      fileId: file.id,
    })

    arof2 = await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: aro2.id,
      fileId: file.id,
    })
  })

  afterAll(async () => {
    // Delete ARO File.
    await ActivityReportObjectiveFile.destroy({
      where: {
        fileId: file.id,
      },
    })

    // Delete ARO.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: [activityReport1.id, activityReport2.id],
      },
    })

    // Delete ARG.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: [activityReport1.id, activityReport2.id],
      },
    })

    // Delete Recipient AR.
    await ActivityReport.destroy({ where: { id: [activityReport1.id, activityReport2.id] } })

    // Delete Recipient Obj's
    await Objective.destroy({ where: { goalId: goal.id }, force: true })

    // Delete Goal.
    await Goal.destroy({
      where: {
        id: goal.id,
      },
      force: true,
    })

    // Delete Grant.
    await Grant.destroy({
      where: {
        id: grant.id,
      },
      individualHooks: true,
    })

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    })

    // Delete file.
    await File.destroy({
      where: {
        id: file.id,
      },
      individualHooks: true,
    })

    // Delete User.
    await User.destroy({
      where: {
        id: user.id,
      },
    })

    // Close Conn.
    await db.sequelize.close()
  })

  it('deletes a specified file for a reports objectives', async () => {
    // Remove file from report 2.
    await deleteSpecificActivityReportObjectiveFile(activityReport2.id, file.id, [objective.id])

    // Make sure file is removed from report 2.
    let aroFiles = await ActivityReportObjectiveFile.findAll({
      where: { id: arof2.id },
    })
    expect(aroFiles.length).toBe(0)

    // Make sure file is NOT removed from report 1.
    aroFiles = await ActivityReportObjectiveFile.findAll({
      where: { activityReportObjectiveId: aro1.id },
    })
    expect(aroFiles.length).toBe(1)
  })
})
