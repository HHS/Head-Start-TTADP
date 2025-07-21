import faker from '@faker-js/faker';
import crypto from 'crypto';
import moment from 'moment';
import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
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
  propagateSubmissionStatus,
} from './activityReport';
import { auditLogger } from '../../logger';

jest.mock('../../policies/activityReport');

describe('activity report model hooks', () => {
  describe('automatic goal status changes', () => {
    let recipient;
    let grant;
    let goal;
    let report;
    let report2;

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

    beforeAll(async () => {
      const n = faker.lorem.sentence(5);
      const n2 = faker.lorem.sentence(5);

      const secret = 'secret';
      const hash = crypto
        .createHmac('md5', secret)
        .update(n)
        .digest('hex');

      const hash2 = crypto
        .createHmac('md5', secret)
        .update(n2)
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

      closedObjective = await Objective.create({
        title: 'Closed Objective',
        goalId: closedGoal.id,
        status: 'Complete',
      });

      approvedReportClosedObjective = await Objective.create({
        title: 'Approved Report Closed Objective',
        goalId: approvedReportClosedGoal.id,
        status: 'Complete',
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
          ],
        },
      });

      await Objective.destroy({
        where: {
          id: [
            objective.id,
            objective2.id,
            closedObjective.id,
            newObjective?.id,
            approvedNewObjective?.id,
          ],
        },
        force: true,
      });

      await ActivityReport.destroy({
        where: {
          id: [report.id, report2.id, reportWithClosedGoal.id, approvedReportWithClosedGoal.id],
        },
      });

      await Goal.destroy({
        where: {
          id: [goal.id, closedGoal.id, newGoal?.id, approvedNewGoal?.id],
        },
        force: true,
      });

      await GrantNumberLink.destroy({
        where: { grantId: grant.id },
        force: true,
      });

      await Grant.unscoped().destroy({
        where: {
          id: grant.id,
        },
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
          id: [closedGoalTemplate.id, approvedGoalTemplate.id],
        },
        force: true, // force to ensure deletion
      });

      await db.sequelize.close();
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
          status: 'In Progress',
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
      expect(activityReportGoals[0].status).toBe('In Progress');

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
          status: 'In Progress',
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
      expect(activityReportGoals[0].status).toBe('In Progress');

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
      expect(moment(testObjective.firstInProgressAt).format('MM/DD/YYYY')).toEqual(testReport.endDate);
      expect(moment(testObjective.lastInProgressAt).format('MM/DD/YYYY')).toEqual(testReport.endDate);
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
            id: objStatusObjective.id,
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
});
