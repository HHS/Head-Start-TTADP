import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  saveGoalsForReport,
} from './goals';
import {
  Goal,
  Grant,
  ActivityReport,
  ActivityReportGoal,
  Recipient,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  ActivityReportGoalFieldResponse,
} from '../models';

describe('saveGoalsForReport multi recipient', () => {
  // Recipients.
  let multiRecipientRecipientA;
  let multiRecipientRecipientB;

  // Grants.
  let multiRecipientGrantOneA;
  let multiRecipientGrantOneB;
  let multiRecipientGrantTwo;

  // Activity Reports.
  let multiRecipientActivityReport;

  // Goals.
  let multiRecipientGoalOneA;
  let multiRecipientGoalOneB;
  let multiRecipientGoalTwo;

  beforeAll(async () => {
    // Create recipients.
    multiRecipientRecipientA = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.company.companyName(),
      uei: 'NNA5N2KHMGN2',
    });

    multiRecipientRecipientB = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.company.companyName(),
      uei: 'NNA5N2KHMGN2',
    });

    // Create grants.
    multiRecipientGrantOneA = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: multiRecipientRecipientA.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    });

    multiRecipientGrantOneB = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: multiRecipientRecipientA.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    });

    multiRecipientGrantTwo = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: multiRecipientRecipientB.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    });

    // Create activity report.
    multiRecipientActivityReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: 1,
      activityRecipientType: 'recipient',
      version: 2,
    });

    // Create goals.
    multiRecipientGoalOneA = await Goal.create({
      name: 'One fei goal to rule them all',
      status: 'Draft',
      grantId: multiRecipientGrantOneA.id,
    });

    multiRecipientGoalOneB = await Goal.create({
      name: 'One fei goal to rule them all',
      status: 'Draft',
      grantId: multiRecipientGrantOneB.id,
    });

    multiRecipientGoalTwo = await Goal.create({
      name: 'One fei goal to rule them all',
      status: 'Draft',
      grantId: multiRecipientGrantTwo.id,
    });

    // find 'FEI root cause' field prompt.
    const fieldPrompt = await GoalTemplateFieldPrompt.findOne({
      where: {
        title: 'FEI root cause',
      },
    });

    // Create GoalFieldResponses.
    await GoalFieldResponse.create({
      goalId: multiRecipientGoalOneA.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: ['Family Circumstance', 'Facilities', 'Other ECE Care Options'],
      onAr: true,
      onApprovedAR: false,
    });

    await GoalFieldResponse.create({
      goalId: multiRecipientGoalOneB.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: [],
      onAr: true,
      onApprovedAR: false,
    });

    await GoalFieldResponse.create({
      goalId: multiRecipientGoalTwo.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: ['Facilities'],
      onAr: true,
      onApprovedAR: false,
    });
  });

  afterAll(async () => {
    // Get all ActivityReportGoals.
    const activityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
      },
    });
    const activityReportGoalIds = activityReportGoals.map((arg) => arg.id);

    // Delete ActivityReportFieldResponses.
    await ActivityReportGoalFieldResponse.destroy({
      where: {
        activityReportGoalId: activityReportGoalIds,
      },
    });

    // Delete ActivityReportGoals.
    await ActivityReportGoal.destroy({
      where: {
        id: activityReportGoalIds,
      },
    });

    // Delete GoalFieldResponses.
    await GoalFieldResponse.destroy({
      where: {
        goalId: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
      },
    });

    // Delete Goals.
    await Goal.destroy({
      where: {
        id: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
      },
    });

    // Delete ActivityReport.
    await ActivityReport.destroy({
      where: {
        id: multiRecipientActivityReport.id,
      },
    });

    // Delete Grants.
    await Grant.destroy({
      where: {
        id: [multiRecipientGrantOneA.id, multiRecipientGrantOneB.id, multiRecipientGrantTwo.id],
      },
    });

    // Delete Recipients.
    await Recipient.destroy({
      where: {
        id: [multiRecipientRecipientA.id, multiRecipientRecipientB.id],
      },
    });
  });

  it('correctly updates multi recipient report root causes', async () => {
    // call the function.
    await saveGoalsForReport([
      {
        name: 'One fei goal to rule them all',
        label: 'One fei goal to rule them all',
        isNew: false,
        goalIds: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
        grantIds: [
          multiRecipientGrantOneA.id,
          multiRecipientGrantOneB.id,
          multiRecipientGrantTwo.id,
        ],
        status: 'In Progress',
        objectives: [],
        // endDate: new Date(),
        regionId: 1,
        source: 'Regional office priority',
        createdVia: 'activityReport',
      },
    ], { id: multiRecipientActivityReport.id });

    // Retrieve ActivityReportGoals.
    const activityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
      },
    });
    const activityReportGoalIds = activityReportGoals.map((arg) => arg.id);

    // Retrieve ActivityReportGoalFieldResponses.
    let activityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: activityReportGoalIds,
      },
    });
    expect(activityReportGoalFieldResponses.length).toBe(3);

    // Check the response.
    const response = activityReportGoalFieldResponses.map((arg) => arg.response);
    expect(response).toContainEqual(['Family Circumstance', 'Facilities', 'Other ECE Care Options']);
    expect(response).toContainEqual([]);
    expect(response).toContainEqual(['Facilities']);

    // Update GoalFieldResponses.
    await GoalFieldResponse.update({
      response: ['First Response Updated', 'Second Response Updated', 'Third Response Updated'],
    }, {
      where: {
        goalId: multiRecipientGoalOneA.id,
      },
    });

    await GoalFieldResponse.update({
      response: ['Fourth Response Updated'],
    }, {
      where: {
        goalId: multiRecipientGoalOneB.id,
      },
    });

    await GoalFieldResponse.update({
      response: ['Sixth Response Updated', 'Seventh Response Updated'],
    }, {
      where: {
        goalId: multiRecipientGoalTwo.id,
      },
    });

    // call the function.
    await saveGoalsForReport([
      {
        name: 'One fei goal to rule them all',
        label: 'One fei goal to rule them all',
        isNew: false,
        goalIds: [multiRecipientGoalOneA.id, multiRecipientGoalOneB.id, multiRecipientGoalTwo.id],
        grantIds: [
          multiRecipientGrantOneA.id,
          multiRecipientGrantOneB.id,
          multiRecipientGrantTwo.id,
        ],
        status: 'In Progress',
        objectives: [],
        // endDate: new Date(),
        regionId: 1,
        source: 'Regional office priority',
        createdVia: 'activityReport',
      },
    ], { id: multiRecipientActivityReport.id });

    activityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: activityReportGoalIds,
      },
    });
    expect(activityReportGoalFieldResponses.length).toBe(3);

    // Check the response.
    const updatedResponses = activityReportGoalFieldResponses.map((arg) => arg.response);
    expect(updatedResponses).toContainEqual(['First Response Updated', 'Second Response Updated', 'Third Response Updated']);
    expect(updatedResponses).toContainEqual(['Fourth Response Updated']);
    expect(updatedResponses).toContainEqual(['Sixth Response Updated', 'Seventh Response Updated']);
  });
});
