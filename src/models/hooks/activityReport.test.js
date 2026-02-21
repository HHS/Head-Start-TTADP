import faker from '@faker-js/faker';
import crypto from 'crypto';
import { DateTime } from 'luxon';
import { APPROVER_STATUSES, REPORT_STATUSES, GOAL_STATUS } from '@ttahub/common';
import db, {
  ActivityReport,
  ActivityReportGoal,
  ActivityReportApprover,
  ActivityRecipient,
  ActivityReportObjective,
  Goal,
  Objective,
  Recipient,
  Grant,
  GrantNumberLink,
  User,
  GoalTemplate,
} from '..';
import { unlockReport } from '../../routes/activityReports/handlers';
import ActivityReportPolicy from '../../policies/activityReport';
import {
  moveDraftGoalsToNotStartedOnSubmission,
  propagateSubmissionStatus,
  revisionBump,
} from './activityReport';
import { auditLogger } from '../../logger';

jest.mock('../../policies/activityReport');

auditLogger.info('Starting up, logger initialized');

describe('activity report model hooks', () => {
  afterAll(async () => {
    auditLogger.info('Cleaning up database after tests');
    await db.sequelize.close();
  });

  describe('automatic goal status changes', () => {
    let recipient;
    let grant;
    let goal;
    let report;
    let report2;

    // Prevent changing objective status on closed goals.
    let reportForClosedGoalTest;
    let templateForClosedGoalTest;
    let templateForInProgressGoalTest;
    // Goals
    let closedGoalForClosedGoalTest;
    let inProgressGoalForClosedGoalTest;
    // Objectives.
    let closedObjectiveForClosedGoalTest;
    let inProgressObjectiveForClosedGoalTest;

    let mockUser;
    let mockApprover;
    let objective;
    let objective2;

    // Restart goal lifecycle tests.
    // Submitted > Approved
    let closedGoalTemplate;
    let reportWithClosedGoal;
    let closedGoal;
    let closedObjective;
    let newGoal;
    let newObjective;
    // Approved > Needs Action
    let approvedGoalTemplate;
    let approvedReportWithClosedGoal;
    let approvedReportClosedGoal;
    let approvedReportClosedObjective;
    let approvedNewGoal;
    let approvedNewObjective;
    // Anything > Submitted
    let submittedGoalTemplate;
    let submittedReportWithClosedGoal;
    let submittedReportClosedGoal;
    let submittedReportClosedObjective;
    let submittedNewGoal;
    let submittedNewObjective;

    beforeAll(async () => {
      const n = faker.lorem.sentence(5);
      const n2 = faker.lorem.sentence(5);
      const n3 = faker.lorem.sentence(5);
      const n4 = faker.lorem.sentence(5);
      const n5 = faker.lorem.sentence(5);

      const secret = 'secret';
      const hash = crypto
        .createHmac('md5', secret)
        .update(n)
        .digest('hex');

      const hash2 = crypto
        .createHmac('md5', secret)
        .update(n2)
        .digest('hex');

      const hash3 = crypto
        .createHmac('md5', secret)
        .update(n3)
        .digest('hex');

      const hash4 = crypto
        .createHmac('md5', secret)
        .update(n4)
        .digest('hex');

      const hash5 = crypto
        .createHmac('md5', secret)
        .update(n5)
        .digest('hex');

      closedGoalTemplate = await GoalTemplate.create({
        hash,
        templateName: n,
        creationMethod: 'Automatic',
      });

      approvedGoalTemplate = await GoalTemplate.create({
        hash2,
        templateName: n2,
        creationMethod: 'Automatic',
      });

      submittedGoalTemplate = await GoalTemplate.create({
        hash3,
        templateName: n3,
        creationMethod: 'Automatic',
      });

      templateForClosedGoalTest = await GoalTemplate.create({
        hash4,
        templateName: n4,
        creationMethod: 'Automatic',
      });

      templateForInProgressGoalTest = await GoalTemplate.create({
        hash5,
        templateName: n5,
        creationMethod: 'Automatic',
      });

      auditLogger.info('Creating recipient, user, and grant');
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      mockUser = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      mockApprover = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      grant = await Grant.create({
        id: faker.datatype.number({ min: 133434 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      goal = await Goal.create({
        name: 'Goal 1',
        status: 'Not Started',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      closedGoal = await Goal.create({
        name: 'Goal 1',
        status: 'Closed',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
        goalTemplateId: closedGoalTemplate.id,
      });

      approvedReportClosedGoal = await Goal.create({
        name: 'Approved Report Closed Goal',
        status: 'Closed',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
        goalTemplateId: approvedGoalTemplate.id,
      });

      submittedReportClosedGoal = await Goal.create({
        name: 'Submitted Report Closed Goal',
        status: 'Closed',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
        goalTemplateId: submittedGoalTemplate.id,
      });

      closedGoalForClosedGoalTest = await Goal.create({
        name: 'Closed Goal For Closed Goal Test',
        status: 'Closed',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
        goalTemplateId: templateForClosedGoalTest.id,
      });

      inProgressGoalForClosedGoalTest = await Goal.create({
        name: 'In Progress Goal For Closed Goal Test',
        status: 'In Progress',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
        goalTemplateId: templateForInProgressGoalTest.id,
      });

      report = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        numberOfParticipants: 1,
        deliveryMethod: 'virtual',
        duration: 10,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        creatorRole: 'TTAC',
        additionalNotes: 'notes',
        language: ['English'],
        activityReason: 'recipient reason',
        version: 2,
      });

      report2 = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        numberOfParticipants: 1,
        deliveryMethod: 'virtual',
        duration: 10,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        creatorRole: 'TTAC',
        version: 2,
        language: ['English'],
        activityReason: 'recipient reason',
      });

      reportWithClosedGoal = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        numberOfParticipants: 1,
        deliveryMethod: 'virtual',
        duration: 10,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        creatorRole: 'TTAC',
        version: 2,
        language: ['English'],
        activityReason: 'recipient reason',
      });

      approvedReportWithClosedGoal = await ActivityReport.create({
        activityRecipientType: 'recipient',
        userId: mockUser.id,
        regionId: 1,
        lastUpdatedById: mockUser.id,
        ECLKCResourcesUsed: ['test'],
        activityRecipients: [{ grantId: grant.id }],
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
      });

      submittedReportWithClosedGoal = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        numberOfParticipants: 1,
        deliveryMethod: 'virtual',
        duration: 10,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        creatorRole: 'TTAC',
        additionalNotes: 'notes',
        language: ['English'],
        activityReason: 'recipient reason',
        version: 2,
      });

      await ActivityReportGoal.create({
        activityReportId: submittedReportWithClosedGoal.id,
        goalId: submittedReportClosedGoal.id,
        status: 'In Progress',
      });

      await ActivityReportGoal.create({
        activityReportId: reportWithClosedGoal.id,
        goalId: closedGoal.id,
        status: 'In Progress',
      });

      await ActivityReportGoal.create({
        activityReportId: approvedReportWithClosedGoal.id,
        goalId: approvedReportClosedGoal.id,
        status: 'In Progress',
      });

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      });

      await ActivityReportGoal.create({
        activityReportId: report2.id,
        goalId: goal.id,
      });

      reportForClosedGoalTest = await ActivityReport.create({
        activityRecipientType: 'recipient',
        userId: mockUser.id,
        regionId: 1,
        lastUpdatedById: mockUser.id,
        ECLKCResourcesUsed: ['test'],
        activityRecipients: [{ grantId: grant.id }],
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
      });

      await ActivityReportGoal.create({
        activityReportId: reportForClosedGoalTest.id,
        goalId: closedGoalForClosedGoalTest.id,
        status: 'In Progress',
      });

      await ActivityReportGoal.create({
        activityReportId: reportForClosedGoalTest.id,
        goalId: inProgressGoalForClosedGoalTest.id,
        status: 'In Progress',
      });

      closedObjectiveForClosedGoalTest = await Objective.create({
        title: 'Closed Objective For Closed Goal Test',
        goalId: closedGoalForClosedGoalTest.id,
        status: 'Complete',
      });

      inProgressObjectiveForClosedGoalTest = await Objective.create({
        title: 'In Progress Objective For Closed Goal Test',
        goalId: inProgressGoalForClosedGoalTest.id,
        status: 'In Progress',
      });

      closedObjective = await Objective.create({
        title: 'Closed Objective',
        goalId: closedGoal.id,
        status: 'Complete',
      });

      submittedReportClosedObjective = await Objective.create({
        title: 'Approved Report Closed Objective',
        goalId: submittedReportClosedGoal.id,
        status: 'Complete',
      });

      approvedReportClosedObjective = await Objective.create({
        title: 'Approved Report Closed Objective',
        goalId: approvedReportClosedGoal.id,
        status: 'Complete',
      });

      await ActivityReportObjective.create({
        activityReportId: reportForClosedGoalTest.id,
        status: 'In Progress',
        objectiveId: closedObjectiveForClosedGoalTest.id,
      });

      await ActivityReportObjective.create({
        activityReportId: reportForClosedGoalTest.id,
        status: 'In Progress',
        objectiveId: inProgressObjectiveForClosedGoalTest.id,
      });

      await ActivityReportObjective.create({
        activityReportId: submittedReportWithClosedGoal.id,
        status: 'In Progress',
        objectiveId: submittedReportClosedObjective.id,
      });

      await ActivityReportObjective.create({
        activityReportId: reportWithClosedGoal.id,
        status: 'In Progress',
        objectiveId: closedObjective.id,
      });

      await ActivityReportObjective.create({
        activityReportId: approvedReportWithClosedGoal.id,
        status: 'In Progress',
        objectiveId: approvedReportClosedObjective.id,
      });

      await ActivityRecipient.create({
        activityReportId: reportForClosedGoalTest.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: report.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: report2.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: reportWithClosedGoal.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: approvedReportWithClosedGoal.id,
        grantId: grant.id,
      });
    });

    afterAll(async () => {
      await ActivityReportApprover.destroy({
        where: {
          activityReportId: [
            report.id,
            report2.id,
            reportWithClosedGoal.id,
            approvedReportWithClosedGoal.id,
            submittedReportWithClosedGoal.id,
            reportForClosedGoalTest.id,
          ],
        },
        force: true,
      });

      await ActivityRecipient.destroy({
        where: {
          activityReportId: [
            report.id,
            report2.id,
            reportWithClosedGoal.id,
            approvedReportWithClosedGoal.id,
            submittedReportWithClosedGoal.id,
            reportForClosedGoalTest.id,
          ],
        },
      });

      await ActivityReportGoal.destroy({
        where: {
          activityReportId: [
            report.id,
            report2.id,
            reportWithClosedGoal.id,
            approvedReportWithClosedGoal.id,
            submittedReportWithClosedGoal.id,
            reportForClosedGoalTest.id,
          ],
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          activityReportId: [
            report.id,
            report2.id,
            reportWithClosedGoal.id,
            approvedReportWithClosedGoal.id,
            submittedReportWithClosedGoal.id,
            reportForClosedGoalTest.id,
          ],
        },
      });

      await Objective.destroy({
        where: {
          [db.Sequelize.Op.or]: [
            {
              id: [
                objective?.id,
                objective2?.id,
                closedObjective?.id,
                newObjective?.id,
                approvedNewObjective?.id,
                submittedNewObjective?.id,
                closedObjectiveForClosedGoalTest?.id,
                inProgressObjectiveForClosedGoalTest?.id,
              ],
            },
            {
              createdViaActivityReportId: [
                report.id,
                report2.id,
                reportWithClosedGoal.id,
                approvedReportWithClosedGoal.id,
                submittedReportWithClosedGoal.id,
                reportForClosedGoalTest.id,
              ],
            },
          ],
        },
        force: true,
      });

      await ActivityReport.destroy({
        where: {
          id: [
            report.id,
            report2.id,
            reportWithClosedGoal.id,
            approvedReportWithClosedGoal.id,
            submittedReportWithClosedGoal.id,
            reportForClosedGoalTest.id,
          ],
        },
      });

      // First delete associated objectives to avoid foreign key constraint violations
      await Objective.destroy({
        where: {
          goalId: {
            [db.Sequelize.Op.in]: db.Sequelize.literal(`(SELECT id FROM "Goals" WHERE "grantId" = ${grant.id})`),
          },
        },
        force: true,
      });

      // Then delete the goals
      await Goal.destroy({
        where: {
          grantId: [grant.id],
        },
        force: true,
        individualHooks: true,
      });

      await Grant.unscoped().destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
        force: true,
      });

      await Recipient.unscoped().destroy({
        where: {
          id: recipient.id,
        },
      });

      await User.destroy({
        where: {
          id: [mockUser.id, mockApprover.id],
        },
      });

      await GoalTemplate.destroy({
        where: {
          id: [
            closedGoalTemplate.id,
            approvedGoalTemplate.id,
            submittedGoalTemplate.id,
            templateForClosedGoalTest.id,
            templateForInProgressGoalTest.id,
          ],
        },
        force: true, // force to ensure deletion
      });
    });

    it('starts a new goal life cycle when the report being submitted is linked to a closed goal', async () => {
      const testReport = await ActivityReport.findByPk(submittedReportWithClosedGoal.id);
      expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.DRAFT);

      await testReport.update({
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
      });

      await ActivityReportApprover.create({
        activityReportId: submittedReportWithClosedGoal.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.SUBMITTED,
        note: 'approver notes',
      });

      // Ensure old goal is still closed.
      const testGoal = await Goal.findByPk(submittedReportClosedGoal.id);
      expect(testGoal.status).toEqual('Closed');

      // Find the new goal with same grantId and goalTemplateId that is NOT closed.
      newGoal = await Goal.findOne({
        where: {
          goalTemplateId: submittedReportClosedGoal.goalTemplateId,
          grantId: submittedReportClosedGoal.grantId,
          status: GOAL_STATUS.NOT_STARTED,
        },
      });

      expect(newGoal).toBeDefined();
      // Get the ActivityReportGoals for the report.
      const activityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: submittedReportWithClosedGoal.id,
        },
      });

      // Assert its using the new goal.
      expect(activityReportGoals.length).toBe(1);
      expect(activityReportGoals[0].goalId).toBe(newGoal.id);
      expect(activityReportGoals[0].status).toBe(GOAL_STATUS.NOT_STARTED);

      // Get the objective for the new goal.
      newObjective = await Objective.findOne({
        where: {
          goalId: newGoal.id,
        },
      });

      // Assert its using the new goal.
      expect(newObjective.status).toBe('Not Started');
      // Get the ActivityReportObjective for the closed objective.
      const activityReportObjectives = await ActivityReportObjective.findAll({
        where: {
          activityReportId: submittedReportWithClosedGoal.id,
        },
      });

      expect(activityReportObjectives.length).toBe(1);
      expect(activityReportObjectives[0].objectiveId).toBe(newObjective.id);
      expect(activityReportObjectives[0].status).toBe('In Progress');
    });

    it('starts a new goal life cycle when the report being approved is linked to a closed goal', async () => {
      const testReport = await ActivityReport.findByPk(reportWithClosedGoal.id);
      expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

      await ActivityReportApprover.create({
        activityReportId: reportWithClosedGoal.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      // Ensure old goal is still closed.
      const testGoal = await Goal.findByPk(closedGoal.id);
      expect(testGoal.status).toEqual('Closed');

      // Find the new goal with same grantId and goalTemplateId that is NOT closed.
      newGoal = await Goal.findOne({
        where: {
          goalTemplateId: closedGoal.goalTemplateId,
          grantId: closedGoal.grantId,
          status: GOAL_STATUS.NOT_STARTED,
        },
      });
      expect(newGoal).toBeDefined();

      // Get the ActivityReportGoals for the report.
      const activityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: reportWithClosedGoal.id,
        },
      });
        // Assert its using the new goal.
      expect(activityReportGoals.length).toBe(1);
      expect(activityReportGoals[0].goalId).toBe(newGoal.id);
      expect(activityReportGoals[0].status).toBe(GOAL_STATUS.NOT_STARTED);

      // Get the objective for the new goal.
      newObjective = await Objective.findOne({
        where: {
          goalId: newGoal.id,
        },
      });
      // Assert its using the new goal.
      expect(newObjective.status).toBe('Not Started');

      // Get the ActivityReportObjective for the closed objective.
      const activityReportObjectives = await ActivityReportObjective.findAll({
        where: {
          activityReportId: reportWithClosedGoal.id,
        },
      });
      expect(activityReportObjectives.length).toBe(1);
      expect(activityReportObjectives[0].objectiveId).toBe(newObjective.id);
      expect(activityReportObjectives[0].status).toBe('In Progress');
    });

    it('starts a new goal life cycle when the approved report is being unlocked to needs action', async () => {
      const testReport = await ActivityReport.findByPk(approvedReportWithClosedGoal.id);
      expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);
      await testReport.update(
        {
          submissionStatus: REPORT_STATUSES.NEEDS_ACTION,
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        },
        {
          validate: false,
        },
      );

      await ActivityReportApprover.create({
        activityReportId: approvedReportWithClosedGoal.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
      });

      // Ensure old goal is still closed.
      const testGoal = await Goal.findByPk(approvedReportClosedGoal.id);
      expect(testGoal.status).toEqual('Closed');

      // Find the new goal with same grantId and goalTemplateId that is NOT closed.
      approvedNewGoal = await Goal.findOne({
        where: {
          goalTemplateId: approvedReportClosedGoal.goalTemplateId,
          grantId: approvedReportClosedGoal.grantId,
          status: GOAL_STATUS.NOT_STARTED,
        },
      });

      expect(approvedNewGoal).toBeDefined();
      // Get the ActivityReportGoals for the report.
      const activityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: approvedReportWithClosedGoal.id,
        },
      });
        // Assert its using the new goal.
      expect(activityReportGoals.length).toBe(1);
      expect(activityReportGoals[0].goalId).toBe(approvedNewGoal.id);
      expect(activityReportGoals[0].status).toBe(GOAL_STATUS.NOT_STARTED);

      // Get the objective for the new goal.
      approvedNewObjective = await Objective.findOne({
        where: {
          goalId: approvedNewGoal.id,
        },
      });
      // Assert its using the new goal.
      expect(approvedNewObjective.status).toBe('Not Started');
      // Get the ActivityReportObjective for the closed objective.
      const activityReportObjectives = await ActivityReportObjective.findAll({
        where: {
          activityReportId: approvedReportWithClosedGoal.id,
        },
      });

      expect(activityReportObjectives.length).toBe(1);
      expect(activityReportObjectives[0].objectiveId).toBe(approvedNewObjective.id);
      expect(activityReportObjectives[0].status).toBe('In Progress');
    });

    it('saving objectives should not change goal status if the goal is in draft', async () => {
      objective = await Objective.create({
        title: 'Objective 1',
        goalId: goal.id,
        status: 'Not Started',
      });

      await ActivityReportObjective.create({
        activityReportId: report.id,
        status: 'In Progress',
        objectiveId: objective.id,
      });

      const testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('Not Started');
    });

    it('submitting the report should set the goal status to "Not Started"', async () => {
      const testReport = await ActivityReport.findByPk(report.id);

      await testReport.update({
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
      });

      const testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('Not Started');
    });

    it('approving the report should set the goal and objectives to "in progress"', async () => {
      let testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('Not Started');

      let testObjective = await Objective.findByPk(objective.id);
      expect(testObjective.status).toEqual('Not Started');

      let testReport = await ActivityReport.findByPk(report.id);
      expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

      await ActivityReportApprover.create({
        activityReportId: report.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'approver notes',
      });

      testReport = await ActivityReport.findByPk(report.id);
      expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      expect(testReport.additionalNotes).toEqual('');

      const approvers = await ActivityReportApprover.findAll({
        where: {
          activityReportId: report.id,
        },
      });

      expect(approvers.length).toEqual(1);
      expect(approvers[0].note).toEqual('');

      testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('In Progress');

      testObjective = await Objective.findByPk(objective.id);
      expect(testObjective.status).toEqual('In Progress');
      expect(DateTime.fromJSDate(new Date(testObjective.firstInProgressAt)).toFormat('MM/dd/yyyy')).toEqual(testReport.endDate);
      expect(DateTime.fromJSDate(new Date(testObjective.lastInProgressAt)).toFormat('MM/dd/yyyy')).toEqual(testReport.endDate);
    });

    it('setting a status to something other than in progress from not started does not skip metadata', async () => {
      objective2 = await Objective.create({
        title: 'Objective 2',
        goalId: goal.id,
        status: 'Not Started',
      });

      await ActivityReportObjective.create({
        activityReportId: report2.id,
        status: 'Suspended',
        objectiveId: objective2.id,
        closeSuspendReason: 'Recipient request',
        closeSuspendContext: 'It was a request from the recipient',
      });

      let testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('In Progress');

      let testReport = await ActivityReport.findByPk(report2.id);

      await testReport.update({
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
      });

      testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('In Progress');

      let testObjective = await Objective.findByPk(objective2.id);
      expect(testObjective.status).toEqual('Not Started');

      await ActivityReportApprover.create({
        activityReportId: report2.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.APPROVED,
      });

      testReport = await ActivityReport.findByPk(report2.id);
      expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('In Progress');

      // here we also verify that the suspend metadata was saved to the parent objective
      testObjective = await Objective.findByPk(objective2.id);
      expect(testObjective.status).toEqual('Suspended');
      expect(testObjective.closeSuspendReason).toEqual('Recipient request');
      expect(testObjective.closeSuspendContext).toEqual('It was a request from the recipient');
    });

    it('unlocking report adjusts objective status', async () => {
      const mockResponse = {
        attachment: jest.fn(),
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn(() => ({
          end: jest.fn(),
        })),
      };

      const mockRequest = {
        session: {
          userId: mockUser.id,
        },
        params: {
          activityReportId: report.id,
        },
      };

      ActivityReportPolicy.mockImplementationOnce(() => ({
        canUnlock: () => true,
      }));

      await unlockReport(mockRequest, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(204);

      const testObjective = await Objective.findByPk(objective.id);
      expect(testObjective.status).toEqual('Not Started');
    });

    it('unlocking report only resets objective status for goals that are not closed', async () => {
      // First, ensure the test is set up correctly
      const testReport = await ActivityReport.findByPk(reportForClosedGoalTest.id);
      expect(testReport.submissionStatus).toEqual(REPORT_STATUSES.APPROVED);

      // Directly update the report status to trigger the hook that will reset objective statuses
      await testReport.update({
        submissionStatus: REPORT_STATUSES.NEEDS_ACTION,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      }, {
        validate: false, // Skip validation since we're only testing the hook behavior
      });

      // Create the approver record with NEEDS_ACTION status to complete the unlock process
      await ActivityReportApprover.create({
        activityReportId: reportForClosedGoalTest.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.NEEDS_ACTION,
      });

      // Now verify the objectives have the expected statuses
      // Closed goal's objective should still be complete
      const completeObjective = await Objective.findByPk(closedObjectiveForClosedGoalTest.id);
      expect(completeObjective.status).toEqual('Complete');

      // In progress goal's objective should be reset to Not Started
      const inProgressObjective = await Objective.findByPk(
        inProgressObjectiveForClosedGoalTest.id,
      );
      expect(inProgressObjective.status).toEqual('Not Started');
    });

    it('automatically unsuspends goals on approval', async () => {
      // Create a suspended goal for testing
      const suspendedGoal = await Goal.create({
        name: 'Suspended Goal to Test Unsuspend',
        status: 'Suspended',
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      // Create a report that will be approved
      const testReportForSuspended = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        numberOfParticipants: 1,
        deliveryMethod: 'virtual',
        duration: 10,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        creatorRole: 'TTAC',
        version: 2,
        language: ['English'],
        activityReason: 'recipient reason',
      });

      // Link the suspended goal to the report
      await ActivityReportGoal.create({
        activityReportId: testReportForSuspended.id,
        goalId: suspendedGoal.id,
        status: 'Suspended',
      });

      await ActivityRecipient.create({
        activityReportId: testReportForSuspended.id,
        grantId: grant.id,
      });

      // Verify initial state - goal is suspended
      let testGoal = await Goal.findByPk(suspendedGoal.id);
      expect(testGoal.status).toEqual('Suspended');

      // Approve the report - this should trigger automaticUnsuspendGoalOnApproval
      await ActivityReportApprover.create({
        activityReportId: testReportForSuspended.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.APPROVED,
        note: 'approver notes',
      });

      // Verify that the goal is now in progress
      testGoal = await Goal.findByPk(suspendedGoal.id);
      expect(testGoal.status).toEqual('In Progress');

      // Clean up test data
      await ActivityReportApprover.destroy({
        where: { activityReportId: testReportForSuspended.id },
        force: true,
      });
      await ActivityRecipient.destroy({
        where: { activityReportId: testReportForSuspended.id },
      });
      await ActivityReportGoal.destroy({
        where: { activityReportId: testReportForSuspended.id },
      });
      await ActivityReport.destroy({
        where: { id: testReportForSuspended.id },
      });
      await Goal.destroy({
        where: { id: suspendedGoal.id },
        force: true,
      });
    });

    describe('sets the correct objective status', () => {
      let objStatusUser;

      let objStatusRecipient;
      let objStatusGrant;

      let existingReport;
      let newReport;

      let objStatusGoal;
      let objStatusObjective;

      beforeAll(async () => {
        objStatusUser = await User.create({
          id: faker.datatype.number(),
          homeRegionId: 1,
          hsesUsername: faker.datatype.string(),
          hsesUserId: faker.datatype.string(),
          lastLogin: new Date(),
        });

        objStatusRecipient = await Recipient.create({
          id: faker.datatype.number(),
          name: faker.name.firstName(),
        });

        objStatusGrant = await Grant.create({
          id: faker.datatype.number({ min: 133434 }),
          number: faker.datatype.string(),
          recipientId: objStatusRecipient.id,
          regionId: 1,
          startDate: new Date(),
          endDate: new Date(),
        });

        objStatusGoal = await Goal.create({
          name: 'Goal to test objective status',
          status: 'Not Started',
          isFromSmartsheetTtaPlan: false,
          onApprovedAR: true,
          grantId: objStatusGrant.id,
          createdVia: 'activityReport',
        });

        objStatusObjective = await Objective.create({
          title: 'Objective to test status',
          goalId: objStatusGoal.id,
          status: 'Not Started',
        });

        existingReport = await ActivityReport.create({
          userId: objStatusUser.id,
          regionId: 1,
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
          numberOfParticipants: 1,
          deliveryMethod: 'virtual',
          duration: 10,
          endDate: '2025-07-09T12:00:00Z',
          startDate: '2000-01-01T12:00:00Z',
          activityRecipientType: 'something',
          requester: 'requester',
          targetPopulations: ['pop'],
          reason: ['reason'],
          participants: ['participants'],
          topics: ['topics'],
          ttaType: ['type'],
          creatorRole: 'TTAC',
          additionalNotes: 'notes',
          language: ['English'],
          activityReason: 'recipient reason',
          version: 2,
        });

        await ActivityRecipient.create({
          activityReportId: existingReport.id,
          grantId: objStatusGrant.id,
        });

        await ActivityReportGoal.create({
          activityReportId: existingReport.id,
          goalId: objStatusGoal.id,
        });

        await ActivityReportObjective.create({
          activityReportId: existingReport.id,
          status: 'In Progress', // This is what the hooks should find as most recent activity.
          objectiveId: objStatusObjective.id,
        });

        newReport = await ActivityReport.create({
          userId: objStatusUser.id,
          regionId: 1,
          submissionStatus: REPORT_STATUSES.SUBMITTED,
          calculatedStatus: REPORT_STATUSES.SUBMITTED,
          numberOfParticipants: 1,
          deliveryMethod: 'virtual',
          duration: 10,
          endDate: '2025-07-08T12:00:00Z',
          startDate: '2000-01-01T12:00:00Z',
          activityRecipientType: 'something',
          requester: 'requester',
          targetPopulations: ['pop'],
          reason: ['reason'],
          participants: ['participants'],
          topics: ['topics'],
          ttaType: ['type'],
          creatorRole: 'TTAC',
          version: 2,
          language: ['English'],
          activityReason: 'recipient reason',
        });

        await ActivityRecipient.create({
          activityReportId: newReport.id,
          grantId: objStatusGrant.id,
        });

        await ActivityReportGoal.create({
          activityReportId: newReport.id,
          goalId: objStatusGoal.id,
        });

        await ActivityReportObjective.create({
          activityReportId: newReport.id,
          status: 'Not Started',
          objectiveId: objStatusObjective.id,
        });
      });

      afterAll(async () => {
        // clean up all the data we created.
        await ActivityReportObjective.destroy({
          where: {
            activityReportId: [existingReport.id, newReport.id],
          },
        });
        await Objective.destroy({
          where: {
            [db.Sequelize.Op.or]: [
              { id: objStatusObjective.id },
              { createdViaActivityReportId: [existingReport.id, newReport.id] },
            ],
          },
          force: true, // force to ensure deletion
        });
        await ActivityReportGoal.destroy({
          where: {
            activityReportId: [existingReport.id, newReport.id],
          },
        });
        await Goal.destroy({
          where: {
            id: objStatusGoal.id,
          },
          force: true, // force to ensure deletion

        });
        await ActivityRecipient.destroy({
          where: {
            activityReportId: [existingReport.id, newReport.id],
          },
        });
        await ActivityReport.destroy({
          where: {
            id: [existingReport.id, newReport.id],
          },
        });
        await GrantNumberLink.destroy({
          where: { grantId: objStatusGrant.id },
          force: true, // force to ensure deletion
        });
        await Grant.unscoped().destroy({
          where: {
            id: objStatusGrant.id,
          },
          force: true, // force to ensure deletion
        });
        await Recipient.unscoped().destroy({
          where: {
            id: objStatusRecipient.id,
          },
        });
        await User.destroy({
          where: {
            id: [objStatusUser.id],
          },
        });
      });

      it('correctly sets the objective status to in progress when the existing objective status is suspended and the lastInProgressAt is defined', async () => {
        // Update the objective status to suspended with lastInProgressAt defined
        const firstInProgressAt = new Date('2025-01-01');
        await Objective.update({
          status: 'Suspended',
          firstInProgressAt,
        }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });

        // Verify initial state
        const testObjective = await Objective.findByPk(objStatusObjective.id);
        expect(testObjective.status).toEqual('Suspended');
        expect(testObjective.firstInProgressAt).toEqual(firstInProgressAt);

        // Update activity report objective status to In Progress
        await ActivityReportObjective.update(
          { status: 'Not Started' },
          {
            where: {
              activityReportId: existingReport.id,
              objectiveId: objStatusObjective.id,
            },
            individualHooks: false,
          },
        );

        const testReport = await ActivityReport.findByPk(existingReport.id);
        expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        // Approve the new report
        await newReport.update({
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        });

        // Check that the objective status is now in progress and lastInProgressAt is updated
        const updatedTestObjective = await Objective.findByPk(objStatusObjective.id);
        expect(updatedTestObjective.status).toEqual('In Progress');

        // Set the firstInProgressAt to null
        await Objective.update({
          firstInProgressAt: null,
        }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });
      });

      it('correctly sets the objective status to suspended when the existing objective status is suspended and the lastInProgressAt is not defined', async () => {
        await Objective.update({
          status: 'Suspended',
          firstInProgressAt: null, // Never was in progress.
        }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });

        // Verify initial state
        const testObjective = await Objective.findByPk(objStatusObjective.id);
        expect(testObjective.status).toEqual('Suspended');
        expect(testObjective.firstInProgressAt).toBeNull();

        // Update activity report objective status to In Progress
        await ActivityReportObjective.update(
          { status: 'Not Started' },
          {
            where: {
              activityReportId: existingReport.id,
              objectiveId: objStatusObjective.id,
            },
            individualHooks: false,
          },
        );

        const testReport = await ActivityReport.findByPk(existingReport.id);
        expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        // Approve the new report
        await newReport.update({
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        });

        // Check that the objective status is now in progress and lastInProgressAt is updated
        const updatedTestObjective = await Objective.findByPk(objStatusObjective.id);
        expect(updatedTestObjective.status).toEqual('Suspended');
      });

      it('correctly sets the objective status to in progress when the existing objective status is in progress', async () => {
        // Update the objective status to in progress without firing any hooks.
        await Objective.update({ status: 'In Progress' }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });
        const testObjective = await Objective.findByPk(objStatusObjective.id);
        expect(testObjective.status).toEqual('In Progress');

        const testReport = await ActivityReport.findByPk(existingReport.id);
        expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        // now we update the new report to be submitted
        await newReport.update({
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        });

        const updatedTestObjective = await Objective.findByPk(objStatusObjective.id);
        expect(updatedTestObjective.status).toEqual('In Progress');
      });
      it('correctly sets the objective status to complete when the existing objective status is complete', async () => {
        // Update the objective status to in progress without firing any hooks.
        await Objective.update({ status: 'Complete' }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });
        const testObjective = await Objective.findByPk(objStatusObjective.id);
        expect(testObjective.status).toEqual('Complete');
        await ActivityReportObjective.update(
          { status: 'Not Started' },
          {
            where: {
              activityReportId: existingReport.id,
              objectiveId: objStatusObjective.id,
            },
            individualHooks: false,
          },
        );
        const testReport = await ActivityReport.findByPk(existingReport.id);
        expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        // now we update the new report to be submitted
        await newReport.update({
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        });

        const updatedTestObjective = await Objective.findByPk(objStatusObjective.id);
        expect(updatedTestObjective.status).toEqual('Complete');
      });

      it('correctly sets the objective status to in progress when the existing objective status is not started', async () => {
        // Update the objective status to in progress without firing any hooks.
        await Objective.update({ status: 'In Progress' }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });
        const testObjective = await Objective.findByPk(objStatusObjective.id);
        expect(testObjective.status).toEqual('In Progress');

        await ActivityReportObjective.update(
          { status: 'Not Started' },
          {
            where: {
              activityReportId: existingReport.id,
              objectiveId: objStatusObjective.id,
            },
            individualHooks: false,
          },
        );
        const testReport = await ActivityReport.findByPk(existingReport.id);
        expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        // now we update the new report to be submitted
        await newReport.update({
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        });

        const updatedTestObjective = await Objective.findByPk(objStatusObjective.id);
        expect(updatedTestObjective.status).toEqual('In Progress');
      });

      it('correctly sets the objective status to suspended when the existing objective status is not started', async () => {
        // Update the objective status to in progress without firing any hooks.
        await Objective.update({ status: 'Suspended' }, {
          where: {
            id: objStatusObjective.id,
          },
          individualHooks: false,
        });
        const testObjective = await Objective.findByPk(objStatusObjective.id);
        expect(testObjective.status).toEqual('Suspended');

        await ActivityReportObjective.update(
          { status: 'Not Started' },
          {
            where: {
              activityReportId: existingReport.id,
              objectiveId: objStatusObjective.id,
            },
            individualHooks: false,
          },
        );
        const testReport = await ActivityReport.findByPk(existingReport.id);
        expect(testReport.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

        // now we update the new report to be submitted
        await newReport.update({
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        });

        const updatedTestObjective = await Objective.findByPk(objStatusObjective.id);
        expect(updatedTestObjective.status).toEqual('Suspended');
      });
    });
  });

  describe('moveDraftGoalsToNotStartedOnSubmission', () => {
    it('logs an error if one is thrown', async () => {
      const mockSequelize = {
        models: {
          Goal: {
            findAll: jest.fn(() => { throw new Error('test error'); }),
          },
          ActivityReport: {},
        },
      };
      const mockInstance = {
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        changed: jest.fn(() => ['submissionStatus']),
        id: 1,
      };
      const mockOptions = {
        transaction: 'transaction',
      };

      jest.spyOn(auditLogger, 'error');

      await moveDraftGoalsToNotStartedOnSubmission(mockSequelize, mockInstance, mockOptions);
      expect(auditLogger.error).toHaveBeenCalled();
    });
  });

  describe('propagateSubmissionStatus', () => {
    it('logs an error if one is thrown updating goals', async () => {
      const mockSequelize = {
        fn: jest.fn(),
        models: {
          ActivityReport: {
            findAll: jest.fn(() => []),
            update: jest.fn(() => {
              throw new Error('test error');
            }),
          },
          GoalTemplate: {
            findOrCreate: jest.fn(() => [{ id: 1, name: 'name' }]),
          },
          Objective: {
            findAll: jest.fn(() => []),
            update: jest.fn(),
          },
          Goal: {
            findAll: jest.fn(() => [{
              id: 1,
              name: 'name',
              createdAt: new Date(),
              goalTemplateId: 1,
              updatedAt: new Date(),
            }]),
            update: jest.fn(() => {
              throw new Error('test error');
            }),
          },
        },
      };
      const mockInstance = {
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        changed: jest.fn(() => ['submissionStatus']),
        id: 1,
        regionId: 1,
      };
      const mockOptions = {
        transaction: 'transaction',
      };

      jest.spyOn(auditLogger, 'error');

      await propagateSubmissionStatus(mockSequelize, mockInstance, mockOptions);
      expect(auditLogger.error).toHaveBeenCalled();
    });
  });

  describe('revisionBump', () => {
    it('increments revision when report is updated', async () => {
      const testReport = await ActivityReport.create({
        userId: 1,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        numberOfParticipants: 1,
        deliveryMethod: 'virtual',
        duration: 10,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        creatorRole: 'TTAC',
        version: 2,
        revision: 0,
      });

      expect(testReport.revision).toBe(0);

      await testReport.update({
        additionalNotes: 'Updated notes',
      });

      await testReport.reload();

      expect(testReport.revision).toBe(1);

      await testReport.update({
        additionalNotes: 'Updated notes again',
      });

      await testReport.reload();

      expect(testReport.revision).toBe(2);

      await ActivityReport.destroy({
        where: {
          id: testReport.id,
        },
        force: true,
      });
    });

    it('does not increment revision when no changes are made', async () => {
      const mockInstance = {
        changed: jest.fn(() => []),
        revision: 5,
        set: jest.fn(),
      };

      const mockOptions = {
        fields: [],
      };

      await revisionBump(null, mockInstance, mockOptions);

      expect(mockInstance.set).not.toHaveBeenCalled();
      expect(mockOptions.fields).toEqual([]);
    });
  });
});
