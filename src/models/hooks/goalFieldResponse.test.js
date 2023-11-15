import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  sequelize,
  User,
  Goal,
  ActivityReport,
  Grant,
  ActivityReportGoal,
  Recipient,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  ActivityReportGoalFieldResponse,
} from '..';

const mockReport = {
  activityRecipientType: 'recipient',
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 20,
  endDate: '2020-10-01T12:00:00Z',
  startDate: '2020-10-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  participants: ['participants'],
  reason: ['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option'],
  topics: ['Child Screening and Assessment', 'Communication'],
  ttaType: ['type'],
  version: 2,
  creatorRole: 'Grantee Specialist',
};

describe('goalFieldResponseHooks', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  describe('syncActivityReportGoalFieldResponses', () => {
    let mockUser;
    let recipient;
    let grantNotToUpdate;
    let recipientToNotUpdate;
    let grant;
    let goal;
    let goalNotToUpdate;
    let report;
    let reportNotToUpdate;
    let goalTemplateFieldPrompt;
    let goalFieldResponse;
    let goalFieldResponseNotToUpdate;
    let activityReportGoalFieldResponse;
    let activityReportGoalFieldResponseNotToUpdate;

    beforeAll(async () => {
      mockUser = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 133434 }),
        name: faker.name.firstName(),
      });

      recipientToNotUpdate = await Recipient.create({
        id: faker.datatype.number({ min: 133434 }),
        name: faker.name.firstName(),
      });

      grant = await Grant.create({
        id: faker.datatype.number({ min: 133434 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      grantNotToUpdate = await Grant.create({
        id: faker.datatype.number({ min: 133434 }),
        number: faker.datatype.string(),
        recipientId: recipientToNotUpdate.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      goal = await Goal.create({
        name: 'Goal 1',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      goalNotToUpdate = await Goal.create({
        name: 'Goal 1 Not to Update',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantNotToUpdate.id,
        createdVia: 'rtr',
      });

      report = await ActivityReport.create({
        ...mockReport,
        grantId: grant.id,
        creatorId: mockUser.id,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        activityRecipients: [{ grantId: grant.id }],
      });

      reportNotToUpdate = await ActivityReport.create({
        ...mockReport,
        grantId: grantNotToUpdate.id,
        creatorId: mockUser.id,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        activityRecipients: [{ grantId: grantNotToUpdate.id }],
      });

      const activityReportGoal = await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      });

      const activityReportGoalNotToUpdate = await ActivityReportGoal.create({
        activityReportId: reportNotToUpdate.id,
        goalId: goalNotToUpdate.id,
      });

      // Get GoalTemplateFieldPrompt with the title 'FEI root cause'.
      goalTemplateFieldPrompt = await GoalTemplateFieldPrompt.findOne({
        where: { title: 'FEI root cause' },
      });

      // Create GoalFieldResponse.
      goalFieldResponse = await GoalFieldResponse.create({
        goalId: goal.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Initial Activity Report Goal Response'],
      });

      // Create GoalFieldResponse not to update.
      goalFieldResponseNotToUpdate = await GoalFieldResponse.create({
        goalId: goalNotToUpdate.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Activity Report Goal Response NOT TO UPDATE'],
      });

      // Create ActivityReportGoalFieldResponse.
      activityReportGoalFieldResponse = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoal.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Initial Activity Report Goal Response'],
      });

      // Create ActivityReportGoalFieldResponse not to update.
      activityReportGoalFieldResponseNotToUpdate = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoalNotToUpdate.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Activity Report Goal Response NOT TO UPDATE'],
      });
    });

    afterAll(async () => {
      // Delete activity report goal field response.
      await ActivityReportGoalFieldResponse.destroy({
        where: {
          id: [activityReportGoalFieldResponse.id, activityReportGoalFieldResponseNotToUpdate.id],
        },
      });

      // Delete goal field response.
      await GoalFieldResponse.destroy({
        where: {
          id: [goalFieldResponse.id, goalFieldResponseNotToUpdate.id],
        },
      });

      // Delete activity report goal.
      await ActivityReportGoal.destroy({
        where: {
          activityReportId: [report.id, reportNotToUpdate.id],
        },
      });

      // Delete activity report.
      await ActivityReport.destroy({
        where: { id: [report.id, reportNotToUpdate.id] },
      });

      // Delete goal.
      await Goal.destroy({
        where: { id: [goal.id, goalNotToUpdate.id] },
      });

      // Delete grant.
      await Grant.destroy({
        where: { id: [grant.id, grantNotToUpdate.id] },
      });

      // Delete recipient.
      await Recipient.destroy({
        where: { id: [recipient.id, recipientToNotUpdate.id] },
      });

      // Delete mock user.
      await User.destroy({
        where: { id: mockUser.id },
      });
    });

    beforeEach(async () => {
      // Reset goal field response.
      await GoalFieldResponse.update(
        { response: ['Initial Activity Report Goal Response'] },
        {
          where: { id: goalFieldResponse.id },
        },
      );

      // Reset activity report goal field response.
      await ActivityReportGoalFieldResponse.update(
        { response: ['Initial Activity Report Goal Response'] },
        {
          where: { id: activityReportGoalFieldResponse.id },
        },
      );

      // Retrieve updated goal field response.
      goalFieldResponse = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponse.id,
        },
      });

      // Retrieve not to update goal field response.
      goalFieldResponseNotToUpdate = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponseNotToUpdate.id,
        },
      });

      // Retrieve updated activity report goal field response.
      activityReportGoalFieldResponse = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponse.id,
        },
      });

      // Retrieve not to update activity report goal field response.
      activityReportGoalFieldResponseNotToUpdate = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseNotToUpdate.id,
        },
      });
    });

    it('should sync the goal field response with the activity report goal response', async () => {
      // Assert initial values.
      expect(goalFieldResponse.response).toEqual(['Initial Activity Report Goal Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);

      // Assert Initial No Change values.
      expect(goalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);

      // HOOK: Change goal response to trigger hook.
      goalFieldResponse.response = ['Updated Activity Report Goal Response'];
      await GoalFieldResponse.update(
        { response: ['Updated Goal Field Response'] },
        {
          where: { id: goalFieldResponse.id },
          individualHooks: true,
        },
      );

      // Retrieve updated goal field response.
      goalFieldResponse = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponse.id,
        },
      });

      // Retrieve updated activity report goal field response.
      activityReportGoalFieldResponse = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponse.id,
        },
      });

      // Assert updated values.
      expect(goalFieldResponse.response).toEqual(['Updated Goal Field Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);

      // Assert no updated values.
      goalFieldResponseNotToUpdate = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponseNotToUpdate.id,
        },
      });

      activityReportGoalFieldResponseNotToUpdate = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseNotToUpdate.id,
        },
      });

      expect(goalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
    });

    it('should not sync the goal field response with the activity report goal response', async () => {
      // Update GoalFieldResponse set onApprovedAR to true.
      await GoalFieldResponse.update(
        { onApprovedAR: true },
        {
          where: { id: goalFieldResponse.id },
        },
      );

      // Assert initial values.
      expect(goalFieldResponse.response).toEqual(['Initial Activity Report Goal Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);

      // Assert Initial No Change values.
      expect(goalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);

      // HOOK: Change goal response to trigger hook.
      await GoalFieldResponse.update(
        { response: ['Updated Goal Field Response'] },
        {
          where: { id: goalFieldResponse.id },
          individualHooks: true,
        },
      );

      // Retrieve updated goal field response.
      goalFieldResponse = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponse.id,
        },
      });

      // Retrieve updated activity report goal field response.
      activityReportGoalFieldResponse = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponse.id,
        },
      });

      // Assert updated values.
      expect(goalFieldResponse.response).toEqual(['Updated Goal Field Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(['Initial Activity Report Goal Response']);

      // Assert no updated values.
      goalFieldResponseNotToUpdate = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponseNotToUpdate.id,
        },
      });

      activityReportGoalFieldResponseNotToUpdate = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseNotToUpdate.id,
        },
      });

      expect(goalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
    });
  });
});
