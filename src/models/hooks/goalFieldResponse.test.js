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
    let goalMissingResponse;
    let activityReportGoalMissingResponse;
    let goalNotToUpdate;
    let report;
    let differentGoalReportNotToUpdate;
    let approvedReport;
    let goalTemplateFieldPrompt;
    let goalFieldResponse;
    let goalFieldResponseDiffGoalNotToUpdate;
    let missingGoalFieldResponse;
    let activityReportGoalFieldResponse;
    let activityReportGoalFieldResponseDiffGoalNotToUpdate;
    let activityReportGoalFieldResponseApproved;
    let activityReportGoal;
    let activityReportGoalNotToUpdate;
    let activityReportGoalApproved;
    let activityReportAlreadyUsingFeiRootCauses;
    let activityReportGoalAlreadyUsingFeiResponse;

    // We should update this report and not create another ActivityReportGoalFieldResponse.
    let activityReportUsingSameFeiGoal;
    let activityReportGoalWithSameFeiGoalResponse;

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
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      goalNotToUpdate = await Goal.create({
        name: 'Goal 1 Not to Update',
        status: 'Draft',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantNotToUpdate.id,
        createdVia: 'rtr',
      });

      goalMissingResponse = await Goal.create({
        name: 'Goal Missing Response',
        status: 'Draft',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'activityReport',
      });

      report = await ActivityReport.create({
        ...mockReport,
        grantId: grant.id,
        creatorId: mockUser.id,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        activityRecipients: [{ grantId: grant.id }],
      });

      activityReportUsingSameFeiGoal = await ActivityReport.create({
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

      activityReportAlreadyUsingFeiRootCauses = await ActivityReport.create({
        ...mockReport,
        grantId: grant.id,
        creatorId: mockUser.id,
        userId: mockUser.id,
        lastUpdatedById: mockUser.id,
        activityRecipients: [{ grantId: grant.id }],
      });

      // Get GoalTemplateFieldPrompt with the title 'FEI root cause'.
      goalTemplateFieldPrompt = await GoalTemplateFieldPrompt.findOne({
        where: { title: 'FEI root cause' },
      });

      // Response should already exist.
      activityReportGoalWithSameFeiGoalResponse = await ActivityReportGoal.create({
        activityReportId: activityReportUsingSameFeiGoal.id,
        goalId: goalMissingResponse.id,
        individualHooks: false,
      });

      // eslint-disable-next-line max-len
      // By putting this before the creation of the GoalFieldResponse we know the hook will create the response.
      activityReportGoalAlreadyUsingFeiResponse = await ActivityReportGoal.create({
        activityReportId: activityReportAlreadyUsingFeiRootCauses.id,
        goalId: goal.id,
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

      // Create missing GoalFieldResponse.
      missingGoalFieldResponse = await GoalFieldResponse.create({
        goalId: goalMissingResponse.id,
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: ['Initial Missing Activity Report Goal Response'],
      });

      activityReportGoal = await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      });

      activityReportGoalNotToUpdate = await ActivityReportGoal.create({
        activityReportId: differentGoalReportNotToUpdate.id,
        goalId: goalNotToUpdate.id,
      });

      // Response should be created and not be duplicated.
      activityReportGoalMissingResponse = await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goalMissingResponse.id,
        individualHooks: false,
      });

      activityReportGoalApproved = await ActivityReportGoal.create({
        activityReportId: approvedReport.id,
        goalId: goal.id,
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
      // Collect all relevant activity report goal IDs
      const activityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: [
            report.id,
            differentGoalReportNotToUpdate.id,
            approvedReport.id,
            activityReportUsingSameFeiGoal.id,
            activityReportAlreadyUsingFeiRootCauses.id,
          ],
        },
      });
      const activityReportGoalIds = activityReportGoals.map((item) => item.id);

      // 1. Delete ActivityReportGoalFieldResponse
      await ActivityReportGoalFieldResponse.destroy({
        where: {
          activityReportGoalId: activityReportGoalIds,
        },
      });

      // 2. Delete GoalFieldResponses (removed invalid ID)
      await GoalFieldResponse.destroy({
        where: {
          id: [
            goalFieldResponse.id,
            goalFieldResponseDiffGoalNotToUpdate.id,
            missingGoalFieldResponse.id,
          ],
        },
      });

      // 3. Delete ActivityReportGoals
      await ActivityReportGoal.destroy({
        where: {
          id: activityReportGoalIds,
        },
      });

      // 4. Delete ActivityReports
      await ActivityReport.destroy({
        where: {
          id: [
            report.id,
            differentGoalReportNotToUpdate.id,
            approvedReport.id,
            activityReportUsingSameFeiGoal.id,
            activityReportAlreadyUsingFeiRootCauses.id,
          ],
        },
      });

      // 5. Delete Goals
      await Goal.destroy({
        where: {
          id: [goal.id, goalNotToUpdate.id, goalMissingResponse.id],
        },
        force: true,
      });

      // 6. Delete Grants
      await Grant.destroy({
        where: {
          id: [grant.id, grantNotToUpdate.id],
        },
        individualHooks: true,
        force: true,
      });

      // 7. Delete Recipients
      await Recipient.destroy({
        where: {
          id: [recipient.id, recipientToNotUpdate.id],
        },
      });

      // 8. Delete mock user
      await User.destroy({
        where: {
          id: mockUser.id,
        },
      });
    });

    beforeEach(async () => {
      // Update activityReportGoalAlreadyUsingFeiResponse response to be what we will update it to.
      await ActivityReportGoalFieldResponse.update(
        { response: ['Updated Activity Report Goal Response'] },
        {
          where: {
            activityReportGoalId: activityReportGoalAlreadyUsingFeiResponse.id,
            goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
          },
          individualHooks: false,
        },
      );

      // Reset goal field response.
      await GoalFieldResponse.update(
        { response: ['Initial Activity Report Goal Response'] },
        {
          where: { id: goalFieldResponse.id },
          individualHooks: false,
        },
      );

      // Reset activity report goal field response.
      await ActivityReportGoalFieldResponse.update(
        { response: ['Initial Activity Report Goal Response'] },
        {
          where: { id: activityReportGoalFieldResponse.id },
          individualHooks: false,
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

      // Delete any ActivityReportGoalFieldResponses for the missing response.
      await ActivityReportGoalFieldResponse.destroy({
        where: {
          activityReportGoalId: activityReportGoalMissingResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
    });

    it('should update and sync the goal field response with the activity report goal response without duplicating', async () => {
      // Assert initial values.
      expect(goalFieldResponse.response).toEqual(['Initial Activity Report Goal Response']);
      expect(activityReportGoalFieldResponse.response).toEqual(goalFieldResponse.response);
      expect(activityReportGoalFieldResponseApproved.response).toEqual(['Initial Approved Activity Report Goal Response']);

      // Assert Initial No Change values.
      expect(goalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);
      expect(activityReportGoalFieldResponseDiffGoalNotToUpdate.response).toEqual(['Activity Report Goal Response NOT TO UPDATE']);

      // Assert the activityReportGoalAlreadyUsingFeiResponse is set.
      let alreadyUsingResponse = await ActivityReportGoalFieldResponse.findOne({
        where: {
          activityReportGoalId: activityReportGoalAlreadyUsingFeiResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(alreadyUsingResponse).not.toBeNull();
      expect(alreadyUsingResponse.response).toEqual(['Updated Activity Report Goal Response']);

      // HOOK: Change goal response to trigger hook.
      goalFieldResponse.response = ['Updated Activity Report Goal Response'];

      // Capture the current time before update.
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

      // Assert we only have one entry still for the same FEI.
      alreadyUsingResponse = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: activityReportGoalAlreadyUsingFeiResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(alreadyUsingResponse.length).toBe(1);
      expect(alreadyUsingResponse[0].response).toEqual(['Updated Goal Field Response']);

      // Assert the final count of ActivityReportGoalFieldResponses.
      const activityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: [
            activityReportGoal.id,
            activityReportGoalApproved.id,
            activityReportGoalNotToUpdate.id,
            activityReportGoalAlreadyUsingFeiResponse.id,
          ],
        },
      });
      expect(activityReportGoalFieldResponses.length).toBe(4);
    });

    it('should create and sync the goal field response with the activity report goal response', async () => {
      // Ensure there are no ActivityReportGoalFieldResponse
      // for one of the ARG's we will create it in the hook.
      let missingResponses = await ActivityReportGoalFieldResponse.findOne({
        where: {
          activityReportGoalId: activityReportGoalMissingResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(missingResponses).toBeNull();

      // Make sure this ActivityReportGoalFieldResponse exists and we don't duplicate it.
      let existingResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: activityReportGoalWithSameFeiGoalResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(existingResponses.length).toBe(1);
      expect(existingResponses[0].response).toEqual(['Initial Missing Activity Report Goal Response']);

      // Retrieve all ActivityReportGoalFieldResponses for the missing response.
      missingResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: activityReportGoalMissingResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(missingResponses.length).toBe(0);

      // HOOK: Change goal response to trigger hook.
      missingGoalFieldResponse.response = ['Updated Missing Activity Report Goal Response'];

      // Update the missing response.
      await GoalFieldResponse.update(
        { response: ['Updated Missing Activity Report Goal Response'] },
        {
          where: { id: missingGoalFieldResponse.id },
          individualHooks: true,
        },
      );

      // Assert the ActivityReport goal field response was created.
      missingResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: activityReportGoalMissingResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(missingResponses.length).toBe(1);
      expect(missingResponses[0].response).toEqual(['Updated Missing Activity Report Goal Response']);

      // Verify we only have one entry still for the same FEI.
      existingResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: activityReportGoalWithSameFeiGoalResponse.id,
          goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        },
      });
      expect(existingResponses.length).toBe(1);
      expect(existingResponses[0].response).toEqual(['Updated Missing Activity Report Goal Response']);

      // Assert the final count of ActivityReportGoalFieldResponses.
      const activityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: [
            activityReportGoalWithSameFeiGoalResponse.id,
            activityReportGoalMissingResponse.id,
          ],
        },
      });
      expect(activityReportGoalFieldResponses.length).toBe(2);
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
