import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportGoal,
  Goal,
  Grant,
  Recipient,
  draftReport,
  createRecipient,
  createGrant,
  createGoal,
  GOAL_STATUS,
  faker,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers'

describe('goalName filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData()
  })

  afterAll(async () => {
    await tearDownSharedTestData()
  })

  describe('goalName', () => {
    let includedReport
    let excludedReport
    let possibleIds

    let recipient
    let grant

    let goalOne
    let goalTwo

    const includedGoalName = `${faker.lorem.sentence(10)}chowder`
    const excludedGoalName = `${faker.lorem.sentence(10)}hams`

    beforeAll(async () => {
      // try {
      recipient = await createRecipient()
      grant = await createGrant({ recipientId: recipient.id })

      goalOne = await createGoal({
        grantId: grant.id,
        name: includedGoalName,
        status: GOAL_STATUS.IN_PROGRESS,
      })
      goalTwo = await createGoal({
        grantId: grant.id,
        name: excludedGoalName,
        status: GOAL_STATUS.IN_PROGRESS,
      })

      // Create reports.
      includedReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.includedUser1.id,
      })

      await ActivityReportGoal.create({
        activityReportId: includedReport.id,
        goalId: goalOne.id,
        name: goalOne.name,
        status: goalOne.status,
      })

      excludedReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.excludedUser.id,
      })

      await ActivityReportGoal.create({
        activityReportId: excludedReport.id,
        goalId: goalTwo.id,
        name: goalTwo.name,
        status: goalTwo.status,
      })

      possibleIds = [includedReport.id, excludedReport.id]
      // } catch (error) {
      //   console.error('Failed on beforeAll - goalName:', error);
      // }
    })

    afterAll(async () => {
      // try {
      if (includedReport && excludedReport) {
        await ActivityReportGoal.destroy({
          where: {
            activityReportId: [includedReport.id, excludedReport.id],
          },
        })
      }

      // Delete reports.
      await ActivityReport.destroy({
        where: { id: [includedReport.id, excludedReport.id] },
      })

      await Goal.destroy({
        where: { id: [goalOne.id, goalTwo.id] },
        force: true,
      })

      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      })

      await Recipient.destroy({
        where: { id: recipient.id },
      })
      // } catch (error) {
      //   console.error('Failed on afterAll - goalName:', error);
      // }
    })

    it('return correct goal name filter search results', async () => {
      const filters = { 'goalName.ctn': ['chowder'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, { id: possibleIds }],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport.id]))
    })

    it('excludes correct goal name filter search results', async () => {
      const filters = { 'goalName.nctn': ['chowder'] }
      const { activityReport: scope } = await filtersToScopes(filters)
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [scope, { id: possibleIds }],
        },
      })
      expect(found.length).toBe(1)
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([excludedReport.id]))
    })
  })
})
