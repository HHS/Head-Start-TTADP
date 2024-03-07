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
    let differentGoalReportNotToUpdate;
    let approvedReport;
    let goalTemplateFieldPrompt;
    let goalFieldResponse;
    let goalFieldResponseDiffGoalNotToUpdate;
    let activityReportGoalFieldResponse;
    let activityReportGoalFieldResponseDiffGoalNotToUpdate;
    let activityReportGoalFieldResponseApproved;

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

      differentGoalReportNotToUpdate = await ActivityReport.create({
        ...mockReport,
        grantId: grantNotToUpdate.id,
        creatorId: mockUser.id,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        activityRecipients: [{ grantId: grantNotToUpdate.id }],
      });

      approvedReport = await ActivityReport.create({
        ...mockReport,
        grantId: grant.id,
        creatorId: mockUser.id,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        activityRecipients: [{ grantId: grant.id }],
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
      });

      const activityReportGoal = await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      });

      const activityReportGoalNotToUpdate = await ActivityReportGoal.create({
        activityReportId: differentGoalReportNotToUpdate.id,
        goalId: goalNotToUpdate.id,
      });

      const activityReportGoalApproved = await ActivityReportGoal.create({
        activityReportId: approvedReport.id,
        goalId: goal.id,
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
      goalFieldResponseDiffGoalNotToUpdate = await GoalFieldResponse.create({
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
      // eslint-disable-next-line max-len
      activityReportGoalFieldResponseDiffGoalNotToUpdate = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoalNotToUpdate.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Activity Report Goal Response NOT TO UPDATE'],
      });

      // Create ActivityReportGoalFieldResponse approved.
      activityReportGoalFieldResponseApproved = await ActivityReportGoalFieldResponse.create({
        activityReportGoalId: activityReportGoalApproved.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Initial Approved Activity Report Goal Response'],
      });
    });

    afterAll(async () => {
      // Delete activity report goal field response.
      await ActivityReportGoalFieldResponse.destroy({
        where: {
          id: [
            activityReportGoalFieldResponse.id,
            activityReportGoalFieldResponseDiffGoalNotToUpdate.id,
            activityReportGoalFieldResponseApproved.id,
          ],
        },
      });

      // Delete goal field response.
      await GoalFieldResponse.destroy({
        where: {
          id: [goalFieldResponse.id, goalFieldResponseDiffGoalNotToUpdate.id],
        },
      });

      // Delete activity report goal.
      await ActivityReportGoal.destroy({
        where: {
          activityReportId: [report.id, differentGoalReportNotToUpdate.id],
        },
      });

      // Delete activity report.
      await ActivityReport.destroy({
        where: { id: [report.id, differentGoalReportNotToUpdate.id, approvedReport.id] },
      });

      // Delete goal.
      await Goal.destroy({
        where: { id: [goal.id, goalNotToUpdate.id] },
      });

      // Delete grant.
      await Grant.destroy({
        where: { id: [grant.id, grantNotToUpdate.id] },
        individualHooks: true,
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
      goalFieldResponseDiffGoalNotToUpdate = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponseDiffGoalNotToUpdate.id,
        },
      });

      // Retrieve updated activity report goal field response.
      activityReportGoalFieldResponse = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponse.id,
        },
      });

      // Retrieve not to update activity report goal field response.
      // eslint-disable-next-line max-len
      activityReportGoalFieldResponseDiffGoalNotToUpdate = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseDiffGoalNotToUpdate.id,
        },
      });
    });

    it('should sync the goal field response with the activity report goal response', async () => {
      // Assert initial values.
      expect(goalFieldResponse.response).toEqual(['Initial Activity Report Goal Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);
      expect(activityReportGoalFieldResponseApproved.response).toEqual(['Initial Approved Activity Report Goal Response']);

      // Assert Initial No Change values.
      expect(goalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);

      // HOOK: Change goal response to trigger hook.
      goalFieldResponse.response = ['Updated Activity Report Goal Response'];

      // Get the current time using moment.
      const beforeGoalFieldResponseUpdate = new Date();

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

      // Retrieve approved activity report goal field response.
      activityReportGoalFieldResponseApproved = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseApproved.id,
        },
      });

      // Assert updated values.
      expect(goalFieldResponse.response).toEqual(['Updated Goal Field Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);
      expect(activityReportGoalFieldResponseApproved.response).toEqual(['Initial Approved Activity Report Goal Response']);

      // Get the activity report associated with activityReportGoalFieldResponse.
      const activityReportUpdatedAt = await ActivityReport.findOne({
        where: {
          id: report.id,
        },
      });

      // Get approved activity report associated with activityReportGoalFieldResponse.
      const activityReportApprovedUpdatedAt = await ActivityReport.findOne({
        where: {
          id: approvedReport.id,
        },
      });

      // Assert update date.
      expect(activityReportUpdatedAt).not.toBeNull();
      const activityReportUpdatedAtDate = new Date(activityReportUpdatedAt.updatedAt);
      expect(activityReportUpdatedAtDate >= beforeGoalFieldResponseUpdate).toBeTruthy();

      // eslint-disable-next-line max-len
      const approvedActivityReportUpdatedAtDate = new Date(activityReportApprovedUpdatedAt.updatedAt);
      expect(approvedActivityReportUpdatedAtDate < beforeGoalFieldResponseUpdate).toBeTruthy();

      // Get report not to update.
      const activityReportNotUpdatedAt = await ActivityReport.findOne({
        where: {
          id: differentGoalReportNotToUpdate.id,
        },
      });

      // Assert we didn't update anything we weren't supposed to.
      expect(activityReportNotUpdatedAt).not.toBeNull();
      const activityReportNotUpdatedAtDate = new Date(activityReportNotUpdatedAt.updatedAt);
      expect(activityReportNotUpdatedAtDate < beforeGoalFieldResponseUpdate).toBeTruthy();

      // Assert no updated values.
      goalFieldResponseDiffGoalNotToUpdate = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponseDiffGoalNotToUpdate.id,
        },
      });

      // eslint-disable-next-line max-len
      activityReportGoalFieldResponseDiffGoalNotToUpdate = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseDiffGoalNotToUpdate.id,
        },
      });

      expect(goalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
    });

    it('should not sync the goal field response with the activity report goal response on approved report', async () => {
      // Update report to approved.
      await ActivityReport.update(
        {
          calculatedStatus: 'approved',
        },
        {
          where: { id: report.id },
        },
      );

      // Assert initial values.
      expect(goalFieldResponse.response).toEqual(['Initial Activity Report Goal Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);

      // Assert Initial No Change values.
      expect(goalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);

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
      goalFieldResponseDiffGoalNotToUpdate = await GoalFieldResponse.findOne({
        where: {
          id: goalFieldResponseDiffGoalNotToUpdate.id,
        },
      });

      // eslint-disable-next-line max-len
      activityReportGoalFieldResponseDiffGoalNotToUpdate = await ActivityReportGoalFieldResponse.findOne({
        where: {
          id: activityReportGoalFieldResponseDiffGoalNotToUpdate.id,
        },
      });

      expect(goalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
    });
  });
});
