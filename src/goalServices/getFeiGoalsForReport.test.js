import faker from '@faker-js/faker';
import { REPORT_STATUSES, SUPPORT_TYPES } from '@ttahub/common';
import getGoalsForReport from './getGoalsForReport';
import {
  Goal,
  ActivityReport,
  ActivityReportGoal,
  User,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  Grant,
  Recipient,
  sequelize,
} from '../models';
import {
  createGoal,
  createGoalTemplate,
  createRecipient,
  createGrant,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';

describe('getFeiGoalsForReport', () => {
  let user;
  let report;

  let goalOne;
  let goalTwo;
  let goalThree;
  let goalFour; // Missing root causes.
  let goalFive; // Missing root causes.
  let recipientOne;
  let recipientTwo;
  let recipientThree;
  let recipientFour;
  let recipientFive;
  let activeGrantOne;
  let activeGrantTwo;
  let activeGrantThree;
  let activeGrantFour;
  let activeGrantFive;

  let template;
  let prompt;
  beforeAll(async () => {
    // Create User.
    const userName = faker.random.word();
    const idIterator = faker.helpers.uniqueArray(faker.datatype.number({ min: 1000 })).values();

    // User.
    user = await User.create({
      id: idIterator.next().value,
      homeRegionId: 1,
      name: userName,
      hsesUsername: userName,
      hsesUserId: userName,
      lastLogin: new Date(),
    });

    // Recipients.
    recipientOne = await createRecipient();
    recipientTwo = await createRecipient();
    recipientThree = await createRecipient();
    recipientFour = await createRecipient();
    recipientFive = await createRecipient();

    // Grants.
    activeGrantOne = await createGrant({
      recipientId: recipientOne.id,
      status: 'Active',
    });

    activeGrantTwo = await createGrant({
      recipientId: recipientTwo.id,
      status: 'Active',
    });

    activeGrantThree = await createGrant({
      recipientId: recipientThree.id,
      status: 'Active',
    });

    activeGrantFour = await createGrant({
      recipientId: recipientFour.id,
      status: 'Active',
    });

    activeGrantFive = await createGrant({
      recipientId: recipientFive.id,
      status: 'Active',
    });

    // Template.
    template = await createGoalTemplate({
      name: faker.lorem.sentence(),
      creationMethod: CREATION_METHOD.CURATED,
    });

    // Goals.
    const feiGoalText = faker.lorem.sentence();
    goalOne = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: feiGoalText,
      grantId: activeGrantOne.id,
      goalTemplateId: template.id,
    });

    goalTwo = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: feiGoalText,
      grantId: activeGrantTwo.id,
      goalTemplateId: template.id,
    });

    goalThree = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: feiGoalText,
      grantId: activeGrantThree.id,
      goalTemplateId: template.id,
    });

    goalFour = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: feiGoalText,
      grantId: activeGrantFour.id,
      goalTemplateId: template.id,
    });

    goalFive = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: feiGoalText,
      grantId: activeGrantFive.id,
      goalTemplateId: template.id,
    });

    // Prompt.
    prompt = await GoalTemplateFieldPrompt.create({
      goalTemplateId: template.id,
      ordinal: 1,
      title: faker.lorem.sentence(),
      prompt: faker.lorem.sentence(),
      type: 'text',
      hint: faker.lorem.sentence(),
      caution: faker.lorem.sentence(),
      options: [],
    });

    // Goal Response.
    await GoalFieldResponse.create({
      goalTemplateFieldPromptId: prompt.id,
      goalId: goalOne.id,
      response: ['response 1', 'response 2'],
      onAR: true,
      onApprovedAR: false,
    });

    await GoalFieldResponse.create({
      goalTemplateFieldPromptId: prompt.id,
      goalId: goalTwo.id,
      response: ['response 1', 'response 2'],
      onAR: true,
      onApprovedAR: false,
    });

    await GoalFieldResponse.create({
      goalTemplateFieldPromptId: prompt.id,
      goalId: goalThree.id,
      response: ['response 4'],
      onAR: true,
      onApprovedAR: false,
    });

    // create report
    report = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.DRAFT,
      userId: user.id,
      regionId: 1,
      lastUpdatedById: user.id,
      ECLKCResourcesUsed: ['test'],
      activityRecipients: [
        { activityRecipientId: recipientOne.id },
        { activityRecipientId: recipientTwo.id },
        { activityRecipientId: recipientThree.id },
        { activityRecipientId: recipientFour.id },
        { activityRecipientId: recipientFive.id }],
      version: 2,
    });

    // ActivityReportGoals.
    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goalOne.id,
      isActivelyEdited: false,
    });

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goalTwo.id,
      isActivelyEdited: false,
    });

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goalThree.id,
      isActivelyEdited: false,
    });

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goalFour.id,
      isActivelyEdited: false,
    });

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goalFive.id,
      isActivelyEdited: false,
    });
  });
  afterAll(async () => {
    // Delete ActivityReportGoals.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: report.id,
      },
    });

    // Delete ActivityReport.
    await ActivityReport.destroy({
      where: {
        id: report.id,
      },
    });

    // Delete GoalFieldResponses.
    await GoalFieldResponse.destroy({
      where: {
        goalId: [goalOne.id, goalTwo.id, goalThree.id, goalFour.id, goalFive.id],
      },
    });

    // Delete GoalTemplateFieldPrompts.
    await GoalTemplateFieldPrompt.destroy({
      where: {
        goalTemplateId: template.id,
      },
    });

    // Delete template.
    await Goal.destroy({
      where: {
        id: template.id,
      },
    });

    // Delete Goals.
    await Goal.destroy({
      where: {
        id: [goalOne.id, goalTwo.id, goalThree.id, goalFour.id, goalFive.id],
      },
      force: true,
    });

    // Delete Grants.
    await Grant.destroy({
      where: {
        id: [
          activeGrantOne.id,
          activeGrantTwo.id,
          activeGrantThree.id,
          activeGrantFour.id,
          activeGrantFive.id,
        ],
      },
      individualHooks: true,
      force: true,
    });

    // Delete Recipients.
    await Recipient.destroy({
      where: {
        id: [
          recipientOne.id,
          recipientTwo.id,
          recipientThree.id,
          recipientFour.id,
          recipientFive.id,
        ],
      },
      force: true,
    });

    // Delete User.
    await User.destroy({
      where: {
        id: user.id,
      },
    });
    await sequelize.close();
  });

  it('returns the correct number of goals and objectives', async () => {
    const goalsForReport = await getGoalsForReport(report.id);
    expect(goalsForReport).toHaveLength(1);
    expect(goalsForReport[0].promptsForReview).toHaveLength(3);

    // Check if the recipients are in the correct grant.
    const assertRecipients = goalsForReport[0].promptsForReview.filter((g) => g.responses.includes('response 1') && g.responses.includes('response 2'));
    expect(assertRecipients.length).toBe(1);
    expect(assertRecipients[0].recipients.length).toBe(2);

    // Recipient 1.
    const recipient1 = assertRecipients[0].recipients.filter((r) => r.id === recipientOne.id);
    expect(recipient1.length).toBe(1);
    expect(recipient1[0].name).toBe(`${recipientOne.name} - ${activeGrantOne.number}`);

    // Recipient 2.
    const recipient2 = assertRecipients[0].recipients.filter((r) => r.id === recipientTwo.id);
    expect(recipient2.length).toBe(1);
    expect(recipient2[0].name).toBe(`${recipientTwo.name} - ${activeGrantTwo.number}`);

    // Check if the recipients are in the correct grant.
    const assertRecipients2 = goalsForReport[0].promptsForReview.filter((g) => g.responses.includes('response 4'));
    expect(assertRecipients2.length).toBe(1);

    // Recipient 3.
    const recipient3 = assertRecipients2[0].recipients.filter((r) => r.id === recipientThree.id);
    expect(recipient3.length).toBe(1);
    expect(recipient3[0].name).toBe(`${recipientThree.name} - ${activeGrantThree.number}`);

    // Recipients missing responses.
    const assertRecipients3 = goalsForReport[0].promptsForReview.filter(
      (g) => g.responses.length === 0,
    );

    // Recipient 4 and Recipient 5 (no responses).
    const recipient4 = assertRecipients3[0].recipients.filter((r) => r.id === recipientFour.id);
    expect(recipient4.length).toBe(1);
    expect(recipient4[0].name).toBe(`${recipientFour.name} - ${activeGrantFour.number}`);

    const recipient5 = assertRecipients3[0].recipients.filter((r) => r.id === recipientFive.id);
    expect(recipient5.length).toBe(1);
    expect(recipient5[0].name).toBe(`${recipientFive.name} - ${activeGrantFive.number}`);
  });
});
