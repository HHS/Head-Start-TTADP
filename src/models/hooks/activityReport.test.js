import faker from '@faker-js/faker';
import { APPROVER_STATUSES, REPORT_STATUSES, ENTITY_TYPES } from '../../constants';
import db, {
  ActivityReport,
  ActivityReportGoal,
  ActivityRecipient,
  ActivityReportObjective,
  Approval,
  Goal,
  Objective,
  Recipient,
  Grant,
  User,
} from '..';
import { createOrUpdate } from '../../services/activityReports';
import { upsertRatifier } from '../../services/collaborators';

describe('activity report model hooks', () => {
  describe('automatic goal status changes', () => {
    let recipient;
    let grant;
    let goal;
    let report;
    let mockUser;
    let mockApprover;
    let objective;

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
      });

      mockApprover = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
      });

      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
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

      report = await createOrUpdate({
        owner: { userId: mockUser.id },
        regionId: 1,
        approval: {
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
        },
        activityRecipients: [{ grantId: grant.id }],
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
      });

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
      });
    });

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          activityReportId: report.id,
        },
      });

      await ActivityReportGoal.destroy({
        where: {
          activityReportId: report.id,
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          activityReportId: report.id,
        },
      });

      await Objective.destroy({
        where: {
          id: objective.id,
        },
      });

      await ActivityReport.destroy({
        where: {
          id: report.id,
        },
      });

      await Goal.destroy({
        where: {
          id: goal.id,
        },
      });

      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });

      await Recipient.destroy({
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
        status: 'In Progress',
      });

      await ActivityReportObjective.create({
        activityReportId: report.id,
        status: 'Complete',
        objectiveId: objective.id,
      });

      const testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('Draft');
    });

    it('submitting the report should set the goal status to "Not Started"', async () => {
      const testReport = await ActivityReport.findByPk(report.id, { include: [{ model: Approval, as: 'approval' }] });

      await Approval.update({
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
      }, {
        where: {
          entityType: ENTITY_TYPES.REPORT,
          entityId: testReport.id,
          tier: 0,
        },
      });

      const testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('Not Started');
    });

    it('approving the report should set the goal to "in progress"', async () => {
      let testReport = await ActivityReport.findByPk(report.id, { include: [{ model: Approval, as: 'approval' }] });
      expect(testReport.approval.calculatedStatus).toEqual(REPORT_STATUSES.SUBMITTED);

      await upsertRatifier({
        entityType: ENTITY_TYPES.REPORT,
        entityId: report.id,
        userId: mockApprover.id,
        status: APPROVER_STATUSES.APPROVED,
        tier: 0,
      });

      testReport = await ActivityReport.findByPk(report.id, { include: [{ model: Approval, as: 'approval' }] });
      expect(testReport.approval.calculatedStatus).toEqual(REPORT_STATUSES.APPROVED);

      const testGoal = await Goal.findByPk(goal.id);
      expect(testGoal.status).toEqual('In Progress');
    });
  });
});
