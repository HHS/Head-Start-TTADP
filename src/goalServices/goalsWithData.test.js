import { Op } from 'sequelize';
import crypto from 'crypto';
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  goalsByIdsAndActivityReport,
} from './goals';
import {
  Goal,
  Grant,
  Objective,
  ActivityReportObjective,
  ActivityReportGoal,
  ActivityReport,
  ActivityRecipient,
  GoalTemplate,
  User,
  Recipient,
} from '../models';
import {
  OBJECTIVE_STATUS,
} from '../constants';
import {} from '../models/helpers/genericCollaborator';

describe('Goals DB service with data', () => {
  describe('goalsByIdsAndActivityReport', () => {
    let user;

    let goalTemplate;

    let recipient;
    let grant;

    let activityReport;

    let goal1;
    let goal2;
    let goal3;

    let objective1;
    let objective2;
    let objective3;
    let objective4;

    const userKey = faker.datatype.number({ min: 7500 });
    const mockUser = {
      id: userKey,
      homeRegionId: 1,
      name: `user${userKey}`,
      hsesUsername: `user${userKey}`,
      hsesUserId: `user${userKey}`,
      lastLogin: new Date(),
    };

    const report = {
      userId: mockUser.id,
      regionId: 1,
      lastUpdatedById: mockUser.id,
      ECLKCResourcesUsed: ['test'],
      submissionStatus: REPORT_STATUSES.APPROVED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      oldApprovingManagerId: 1,
      numberOfParticipants: 1,
      deliveryMethod: 'method',
      duration: 0,
      endDate: '2020-09-01T12:00:00Z',
      startDate: '2020-09-01T12:00:00Z',
      requester: 'requester',
      targetPopulations: ['pop'],
      participants: ['participants'],
      reason: ['COVID-19 response', 'Complaint'],
      topics: ['Learning Environments', 'Nutrition', 'Physical Health and Screenings'],
      ttaType: ['type'],
      version: 2,
    };

    beforeAll(async () => {
      // Create mock user.
      user = await User.create(mockUser);

      // Create goal template.
      const secret = 'secret';
      const n = faker.lorem.sentence(5);
      const hash = crypto
        .createHmac('md5', secret)
        .update(n)
        .digest('hex');

      goalTemplate = await GoalTemplate.create({
        hash,
        templateName: n,
        creationMethod: 'Automatic',
      });

      // Create recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      // Create grant.
      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });
      // Create goals.
      goal1 = await Goal.create({
        name: 'Goal 1 - Closed',
        status: 'Closed',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        grantId: grant.id,
        createdAt: '2021-05-02T19:16:15.842Z',
        onApprovedAR: true,
        createdVia: 'activityReport',
        goalTemplateId: goalTemplate.id,
      }, { hooks: false });
      goal2 = await Goal.create({
        name: 'Goal 2 - Closed',
        status: 'Closed',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        grantId: grant.id,
        createdAt: '2021-05-02T19:16:15.842Z',
        onApprovedAR: true,
        createdVia: 'activityReport',
        goalTemplateId: goalTemplate.id,
      }, { hooks: false });
      goal3 = await Goal.create({
        name: 'Goal 3 - Open',
        status: 'In Progress',
        timeframe: '12 months',
        isFromSmartsheetTtaPlan: false,
        grantId: grant.id,
        createdAt: '2021-05-02T19:16:15.842Z',
        onApprovedAR: true,
        createdVia: 'activityReport',
        goalTemplateId: goalTemplate.id,
      }, { hooks: false });

      // Create objectives for Goal 1.
      objective1 = await Objective.create({
        goalId: goal1.id,
        title: 'Goal 1 - Objective 1',
        status: OBJECTIVE_STATUS.COMPLETE,
        onApprovedAR: true,
      }, { hooks: false });

      objective2 = await Objective.create({
        goalId: goal2.id,
        title: 'Goal 2 - Objective 1',
        status: OBJECTIVE_STATUS.COMPLETE,
        onApprovedAR: true,
      }, { hooks: false });

      objective3 = await Objective.create({
        goalId: goal2.id,
        title: 'Goal 3 - Objective 2',
        status: OBJECTIVE_STATUS.COMPLETE,
        onApprovedAR: true,
      }, { hooks: false });

      objective4 = await Objective.create({
        goalId: goal3.id,
        title: 'Goal 3 - Objective 1',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onApprovedAR: false,
      }, { hooks: false });

      // Create activity report.
      activityReport = await ActivityReport.create({
        // activityRecipientType: 'recipient',
        submissionStatus: REPORT_STATUSES.DRAFT,
        userId: mockUser.id,
        regionId: 1,
        lastUpdatedById: mockUser.id,
        version: 2,
        activityRecipients: [{ grantId: grant.id }],
      });

      // Create ActivityReportGoal.
      await ActivityReportGoal.create({
        activityReportId: activityReport.id,
        goalId: goal3.id,
        isActivelyEdited: false,
      }, { hooks: false });

      // Create ActivityReportObjective.
      await ActivityReportObjective.create({
        objectiveId: objective4.id,
        activityReportId: activityReport.id,
        ttaProvided: 'Goal 3 - Objective 1 tta',
        status: 'In Progress',
      }, { hooks: false });
    });

    afterAll(async () => {
      // Clean up activity report objectives.
      await ActivityReportObjective.destroy({ where: { activityReportId: activityReport.id } });

      // Clean up activity report goals.
      await ActivityReportGoal.destroy({ where: { activityReportId: activityReport.id } });

      // Clean up activity report.
      await ActivityReport.destroy({ where: { id: activityReport.id } });

      // Clean up objectives.
      const objectiveIds = [objective1.id, objective2.id, objective3.id, objective4.id];
      await Objective.destroy({ where: { id: objectiveIds }, force: true });

      // Clean up goals.
      await Goal.destroy({ where: { id: [goal1.id, goal2.id, goal3.id] }, force: true });

      // Clean up goal template.
      await GoalTemplate.destroy({ where: { id: goalTemplate.id } });

      // Clean up grant.
      await Grant.destroy({ where: { id: grant.id }, force: true, individualHooks: true });

      // Clean up recipient.
      await ActivityRecipient.destroy({ where: { id: recipient.id }, force: true });

      // Clean up user.
      await User.destroy({ where: { id: mockUser.id }, force: true });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('correctly return all past objective templates for the grant template combination', async () => {
      const result = await goalsByIdsAndActivityReport(goal3.id, activityReport.id);
      // Expect result to have the correct number of goals.
      expect(result.length).toBe(1);

      // Expect the first goal to have the correct number of objectives.
      expect(result[0].objectives.length).toBe(4);

      // assert the correct objectives are returned
      const assertObjective1 = result[0].objectives.find((o) => o.title === 'Goal 1 - Objective 1');
      const assertObjective2 = result[0].objectives.find((o) => o.title === 'Goal 2 - Objective 1');
      const assertObjective3 = result[0].objectives.find((o) => o.title === 'Goal 2 - Objective 2');
      const assertObjective4 = result[0].objectives.find((o) => o.title === 'Goal 3 - Objective 1');
    });
  });
});
