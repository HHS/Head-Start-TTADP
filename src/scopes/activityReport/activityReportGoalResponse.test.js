import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  Goal,
  GoalTemplate,
  GoalTemplateFieldPrompt,
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
} from './testHelpers';

describe('activityReportGoalResponse filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('activityReportGoalResponse', () => {
    let includedReport;
    let excludedReport;
    let possibleIds;

    let recipient;
    let grant;
    let grantTwo;

    let goalOne;
    let goalTwo;

    let goalTemplate;
    let goalTemplateFieldPrompt;

    const includedRootCauseResponse = `${faker.lorem.sentence(10)}chowder`;
    const excludedRootCauseResponse = `${faker.lorem.sentence(10)}hams`;

    beforeAll(async () => {
      recipient = await createRecipient();
      grant = await createGrant({ recipientId: recipient.id });
      grantTwo = await createGrant({ recipientId: recipient.id });

      goalTemplate = await GoalTemplate.create({
        templateName: 'Goal Template For Response Test',
        hash: 'goal-template-hash',
        templateNameModifiedAt: new Date(),
        lastUsed: new Date(),
        creationMethod: 'Curated',
      });

      goalTemplateFieldPrompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: goalTemplate.id,
        ordinal: 1,
        title: 'FEI root cause',
        prompt: 'FEI root cause',
        hint: '',
        caution: '',
        fieldType: 'multiselect',
        options: ['Community Partnerships', 'Facilities', 'Family Circumstances'],
        validations: {},
      });

      goalOne = await createGoal({
        grantId: grant.id,
        name: faker.lorem.sentence(10),
        status: GOAL_STATUS.IN_PROGRESS,
        goalTemplateId: goalTemplate.id,
      });

      goalTwo = await createGoal({
        grantId: grantTwo.id,
        name: faker.lorem.sentence(10),
        status: GOAL_STATUS.IN_PROGRESS,
        goalTemplateId: goalTemplate.id,
      });

      // Create reports.
      includedReport = await ActivityReport.create(
        {
          ...draftReport,
          userId: sharedTestData.includedUser1.id,
        },
      );

      const arGoalOne = await ActivityReportGoal.create({
        activityReportId: includedReport.id,
        goalId: goalOne.id,
        name: goalOne.name,
        status: goalOne.status,
      });

      await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: arGoalOne.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: [includedRootCauseResponse],
      });

      excludedReport = await ActivityReport.create(
        {
          ...draftReport,
          userId: sharedTestData.excludedUser.id,
        },
      );

      const arGoalTwo = await ActivityReportGoal.create({
        activityReportId: excludedReport.id,
        goalId: goalTwo.id,
        name: goalTwo.name,
        status: goalTwo.status,
      });

      await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: arGoalTwo.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: [excludedRootCauseResponse],
      });

      possibleIds = [
        includedReport.id,
        excludedReport.id,
      ];
    });

    afterAll(async () => {
      if (includedReport && excludedReport) {
        await ActivityReportGoalFieldResponse.destroy({
          where: {
            goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
          },
        });

        await ActivityReportGoal.destroy({
          where: {
            activityReportId: [includedReport.id, excludedReport.id],
          },
        });
      }

      // Delete reports.
      await ActivityReport.destroy({
        where: { id: [includedReport.id, excludedReport.id] },
      });

      await Goal.destroy({
        where: { id: [goalOne.id, goalTwo.id] },
        force: true,
      });

      await GoalTemplateFieldPrompt.destroy({
        where: { id: goalTemplateFieldPrompt.id },
      });

      await GoalTemplate.destroy({
        where: { id: goalTemplate.id },
        individualHooks: true,
      });

      await Grant.destroy({
        where: { id: [grant.id, grantTwo.id] },
        individualHooks: true,
      });

      await Recipient.destroy({
        where: { id: recipient.id },
      });
    });

    it('return correct activityReportGoalResponse filter search results', async () => {
      const filters = { 'activityReportGoalResponse.in': ['chowder'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleIds },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport.id]));
    });

    it('excludes correct activityReportGoalResponse filter search results', async () => {
      const filters = { 'activityReportGoalResponse.nin': ['chowder'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleIds },
          ],
        },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          excludedReport.id,
        ]));
    });
  });
});
