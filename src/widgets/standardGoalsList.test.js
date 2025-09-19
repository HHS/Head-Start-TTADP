import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  Goal,
  GoalTemplate,
  User,
  Grant,
  Recipient,
} from '../models';
import filtersToScopes from '../scopes';
import standardGoalsList from './standardGoalsList';
import { CREATION_METHOD } from '../constants';

const mockUser = {
  homeRegionId: 1,
  name: faker.name.findName(),
  hsesUsername: faker.internet.email(),
  hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
  lastLogin: new Date(),
};

describe('standardGoalsList', () => {
  let user;
  let recipient;
  let recipient2;
  let activityRecipient;
  let activityRecipient2;
  let activityRecipientPrestandard;
  let grant;
  let grant2;
  let grantPrestandard;
  let report;
  let report2;
  let goalTemplate1;
  let goalTemplate2;
  let goalTemplate3;
  let goal1;
  let goal2;
  let goal3;
  let goal4;
  let prestandardGoal;

  beforeAll(async () => {
    // Create test user
    user = await User.create(mockUser);

    // Create test recipients
    recipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'Test Recipient 1',
      uei: 'TEST123456789',
    });

    recipient2 = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'Test Recipient 2',
      uei: 'TEST987654321',
    });

    // Create test grants
    grant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: faker.datatype.string(),
      regionId: 1,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2025, 1, 1),
      recipientId: recipient.id,
    });

    grant2 = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: faker.datatype.string(),
      regionId: 1,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2025, 1, 1),
      recipientId: recipient2.id,
    });

    // Create a third grant for prestandard goal
    grantPrestandard = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: faker.datatype.string(),
      regionId: 1,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date(2025, 1, 1),
      recipientId: recipient.id, // Using the first recipient
    });

    // Create test report
    report = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: user.id,
      regionId: 1,
      numberOfParticipants: 10,
      deliveryMethod: 'Virtual',
      duration: 1,
      startDate: new Date(),
      endDate: new Date(),
      version: 2,
    });

    // Create activity recipient
    activityRecipient = await ActivityRecipient.create({
      activityReportId: report.id,
      grantId: grant.id, // Use the grant ID we created in this test
    });

    // Create goal templates with different creation methods
    goalTemplate1 = await GoalTemplate.create({
      templateName: '(Standard 1) Curated Template',
      creationMethod: CREATION_METHOD.CURATED,
      hash: 'c94d65645fe10a739514cf72125bb204', // MD5 hash of 'Curated Template'
    });

    goalTemplate2 = await GoalTemplate.create({
      templateName: '(Standard 2) Automatic Template',
      creationMethod: CREATION_METHOD.AUTOMATIC,
      hash: '5ea626a33fb325fe51f55a0af62fec72', // MD5 hash of 'Automatic Template'
    });

    goalTemplate3 = await GoalTemplate.create({
      templateName: '(Standard 3) Curated Template',
      creationMethod: CREATION_METHOD.CURATED,
      hash: 'aa2f5d5648659578a518f9df784f4aed', // MD5 hash of 'Another Curated Template'
    });

    // Create goals with different templates
    goal1 = await Goal.create({
      name: 'Curated Goal',
      grantId: grant.id,
      goalTemplateId: goalTemplate1.id,
      status: 'Not Started',
      timeframe: '2023-2024',
      isFromSmartsheetTtaPlan: false,
      onAR: true,
      onApprovedAR: false,
      rtrOrder: 1,
      prestandard: false,
    });

    goal2 = await Goal.create({
      name: 'Automatic Goal',
      grantId: grant.id,
      goalTemplateId: goalTemplate2.id,
      status: 'Not Started',
      timeframe: '2023-2024',
      isFromSmartsheetTtaPlan: false,
      onAR: true,
      onApprovedAR: false,
      rtrOrder: 2,
      prestandard: false,
    });

    // Create a second report
    report2 = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: user.id,
      regionId: 1,
      numberOfParticipants: 5,
      deliveryMethod: 'Virtual',
      duration: 2,
      startDate: new Date(),
      endDate: new Date(),
      version: 2,
    });

    // Create activity recipient for second report with the second grant
    activityRecipient2 = await ActivityRecipient.create({
      activityReportId: report2.id,
      grantId: grant2.id, // Use the second grant
    });

    // Create additional goals for the second report
    goal3 = await Goal.create({
      name: 'Second Report Curated Goal 1',
      grantId: grant2.id, // Use the second grant
      goalTemplateId: goalTemplate1.id, // Reusing first curated template
      status: 'Not Started',
      timeframe: '2023-2024',
      isFromSmartsheetTtaPlan: false,
      onAR: true,
      onApprovedAR: false,
      rtrOrder: 1,
      prestandard: false,
    });

    goal4 = await Goal.create({
      name: 'Second Report Curated Goal 2',
      grantId: grant2.id, // Use the second grant
      goalTemplateId: goalTemplate3.id, // Using the new curated template
      status: 'Not Started',
      timeframe: '2023-2024',
      isFromSmartsheetTtaPlan: false,
      onAR: true,
      onApprovedAR: false,
      rtrOrder: 2,
      prestandard: false,
    });

    // Create a prestandard goal with a curated template
    prestandardGoal = await Goal.create({
      name: 'Prestandard Goal',
      grantId: grantPrestandard.id, // Using the dedicated grant for prestandard goal
      goalTemplateId: goalTemplate1.id, // Using the first curated template
      status: 'Not Started',
      timeframe: '2023-2024',
      isFromSmartsheetTtaPlan: false,
      onAR: true,
      onApprovedAR: false,
      rtrOrder: 3,
      prestandard: true, // This is set to true which should exclude it from results
    }, { hooks: false });

    // Create activity recipient for prestandard goal
    activityRecipientPrestandard = await ActivityRecipient.create({
      activityReportId: report.id,
      grantId: grantPrestandard.id, // Using the prestandard grant
    });

    // Link goals to first report
    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal1.id,
    });

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal2.id,
    });

    // Link prestandard goal to first report
    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: prestandardGoal.id,
    });

    // Link goals to second report
    await ActivityReportGoal.create({
      activityReportId: report2.id,
      goalId: goal3.id,
    });

    await ActivityReportGoal.create({
      activityReportId: report2.id,
      goalId: goal4.id,
    });
  });

  afterAll(async () => {
    // Clean up test data in reverse order of creation to handle dependencies
    // First, remove linking tables
    await ActivityReportGoal.destroy({
      where: {
        goalId: [goal1.id, goal2.id, goal3.id, goal4.id, prestandardGoal.id],
      },
      force: true,
    });

    // Then remove dependent entities with force: true to override foreign key constraints
    await Goal.destroy({
      where: {
        id: [goal1.id, goal2.id, goal3.id, goal4.id, prestandardGoal.id],
      },
      force: true,
    });

    await ActivityRecipient.destroy({
      where: {
        id: [activityRecipient.id, activityRecipient2.id, activityRecipientPrestandard.id],
      },
      force: true,
    });

    await ActivityReport.destroy({
      where: {
        id: [report.id, report2.id],
      },
      force: true,
    });

    // Now we can safely remove the templates, grant, and recipient
    await GoalTemplate.destroy({
      where: {
        id: [goalTemplate1.id, goalTemplate2.id, goalTemplate3.id],
      },
      force: true,
    });

    await Grant.destroy({
      where: {
        id: [grant.id, grant2.id, grantPrestandard.id],
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: [recipient.id, recipient2.id],
      },
    });

    await User.destroy({
      where: {
        id: user.id,
      },
    });
  });

  it('returns counts of standard goals linked to activity reports (excluding prestandard goals)', async () => {
    // Get all scopes
    const scopes = filtersToScopes({});

    // Run the function
    const results = await standardGoalsList(scopes);

    // We should have two results for the distinct template IDs, both labeled as 'Unknown'
    expect(results).toHaveLength(2);

    // Results are sorted by count in descending order
    // First result should be for templateId1 which appears in both reports
    expect(results[0].name).toBe('Standard 1');
    expect(results[0].count).toBe(2); // Template1 is used in both reports (excluding prestandard)

    // Second result should be for templateId3 which appears only in second report
    expect(results[1].name).toBe('Standard 3');
    expect(results[1].count).toBe(1); // Template3 is used only in the second report

    // Verify that the count for Template1 is 2, not 3, confirming prestandard goal was excluded
    // If prestandard goal was counted, Template1 would have count=3
    const template1Count = results.find((r) => r.name === 'Standard 1').count;
    expect(template1Count).toBe(2);

    // The total count of results should be 2, one for each distinct standard
    // We should not see an additional entry for the prestandard goal
    expect(results.reduce((sum, item) => sum + item.count, 0)).toBe(3);
    expect(results.length).toBe(2);
  });

  it('filters by report scopes', async () => {
    // Create scopes with a filter that won't match our test data
    const query = { 'region.in': ['999'] };
    const scopes = await filtersToScopes(query);

    // Run the function
    const results = await standardGoalsList(scopes);

    // Should return empty since our test data doesn't match the filter
    expect(results).toHaveLength(0);
  });
});
