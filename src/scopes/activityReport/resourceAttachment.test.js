import db from '../../models'
import {
  Op,
  filtersToScopes,
  ActivityReport,
  Objective,
  ActivityReportObjective,
  Goal,
  Grant,
  Recipient,
  draftReport,
  createRecipient,
  createGrant,
  createGoal,
  createActivityReportObjectiveFileMetaData,
  GOAL_STATUS,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('resourceAttachment filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('resourceAttachment', () => {
    let includedReport1
    let includedReport2
    let excludedReport
    let possibleIds

    let recipient
    let grant
    let goal
    let objective1
    let objective2
    let objective3
    let aro1
    let aro2
    let aro3

    beforeAll(async () => {
      recipient = await createRecipient()
      grant = await createGrant({ recipientId: recipient.id })
      goal = await createGoal({
        grantId: grant.id,
        status: GOAL_STATUS.IN_PROGRESS,
      })

      objective1 = await Objective.create({
        goalId: goal.id,
        title: 'objective for resource attachment test 1',
        status: 'Not Started',
      })

      objective2 = await Objective.create({
        goalId: goal.id,
        title: 'objective for resource attachment test 2',
        status: 'Not Started',
      })

      objective3 = await Objective.create({
        goalId: goal.id,
        title: 'objective for resource attachment test 3',
        status: 'Not Started',
      })

      includedReport1 = await ActivityReport.create({
        ...draftReport,
      })

      includedReport2 = await ActivityReport.create({
        ...draftReport,
      })

      excludedReport = await ActivityReport.create({
        ...draftReport,
      })

      possibleIds = [includedReport1.id, includedReport2.id, excludedReport.id, sharedTestData.globallyExcludedReport.id]

      aro1 = await ActivityReportObjective.create({
        activityReportId: includedReport1.id,
        objectiveId: objective1.id,
      })

      aro2 = await ActivityReportObjective.create({
        activityReportId: includedReport2.id,
        objectiveId: objective2.id,
      })

      aro3 = await ActivityReportObjective.create({
        activityReportId: excludedReport.id,
        objectiveId: objective3.id,
      })

      // Create file attachments.
      await createActivityReportObjectiveFileMetaData('included-file-1.pdf', 'included-file-1.pdf', [aro1.id], 100)

      await createActivityReportObjectiveFileMetaData('included-file-2.pdf', 'included-file-2.pdf', [aro2.id], 100)

      await createActivityReportObjectiveFileMetaData('excluded-file.pdf', 'excluded-file.pdf', [aro3.id], 100)
    })

    afterAll(async () => {
      // Clean up files first.
      await db.ActivityReportObjectiveFile.destroy({
        where: { activityReportObjectiveId: [aro1.id, aro2.id, aro3.id] },
      })

      await db.File.destroy({
        where: {
          originalFileName: ['included-file-1.pdf', 'included-file-2.pdf', 'excluded-file.pdf'],
        },
      })

      await ActivityReportObjective.destroy({
        where: { id: [aro1.id, aro2.id, aro3.id] },
      })

      await Objective.destroy({
        where: { id: [objective1.id, objective2.id, objective3.id] },
        force: true,
      })

      await Goal.destroy({
        where: { id: goal.id },
        force: true,
      })

      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      })

      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      })

      await Recipient.destroy({
        where: { id: recipient.id },
      })
    })

    it('includes reports with matching resource attachment', async () => {
      const filters = { 'resourceAttachment.ctn': ['included-file'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]))
    })

    it('excludes reports with matching resource attachment', async () => {
      const filters = { 'resourceAttachment.nctn': ['included-file'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(2)
      expect(found.map((f) => f.id))
        // eslint-disable-next-line max-len
        .toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]))
    })

    it('includes reports with exact matching resource attachment', async () => {
      const filters = { 'resourceAttachment.ctn': ['included-file-1.pdf'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport1.id]))
    })
  })
})
