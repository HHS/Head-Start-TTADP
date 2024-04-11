import faker from '@faker-js/faker';
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
  User,
} from '..';
import { unlockReport } from '../../routes/activityReports/handlers';
import ActivityReportPolicy from '../../policies/activityReport';
import {
  moveDraftGoalsToNotStartedOnSubmission,
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

    beforeAll(async () => {
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
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
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
      });

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      });

      await ActivityReportGoal.create({
        activityReportId: report2.id,
        goalId: goal.id,
      });

      await ActivityRecipient.create({
        activityReportId: report.id,
        grantId: grant.id,
      });

      await ActivityRecipient.create({
        activityReportId: report2.id,
        grantId: grant.id,
      });
    });

    afterAll(async () => {
      await ActivityReportApprover.destroy({
        where: {
          activityReportId: [report.id, report2.id],
        },
        force: true,
      });

      await ActivityRecipient.destroy({
        where: {
          activityReportId: [report.id, report2.id],
        },
      });

      await ActivityReportGoal.destroy({
        where: {
          activityReportId: [report.id, report2.id],
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          activityReportId: [report.id, report2.id],
        },
      });

      await Objective.destroy({
        where: {
          id: [objective.id, objective2.id],
        },
        force: true,
      });

      await ActivityReport.destroy({
        where: {
          id: [report.id, report2.id],
        },
      });

      await Goal.destroy({
        where: {
          id: goal.id,
        },
        force: true,
      });

      await Grant.unscoped().destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
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
      await db.sequelize.close();
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
      expect(testGoal.status).toEqual('Draft');
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
      expect(testGoal.firstInProgressAt).toEqual(null);
      expect(testGoal.lastInProgressAt).toEqual(null);

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
      expect(moment(testGoal.firstInProgressAt).format('MM/DD/YYYY')).toEqual(testReport.endDate);
      expect(moment(testGoal.lastInProgressAt).format('MM/DD/YYYY')).toEqual(testReport.endDate);

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
  });
});

describe('moveDraftGoalsToNotStartedOnSubmission', () => {
  it('logs an error if one is thrown', async () => {
    const mockSequelize = {
      models: {
        Goal: {
          findAll: jest.fn(() => []),
          update: jest.fn(() => {
            throw new Error('test error');
          }),
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
