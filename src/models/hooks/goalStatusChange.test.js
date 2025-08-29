import faker from '@faker-js/faker';
import {
  GOAL_STATUS,
  CLOSE_SUSPEND_REASONS,
  REPORT_STATUSES,
} from '@ttahub/common';
import {
  sequelize,
  GoalStatusChange,
  Grant,
  GrantNumberLink,
  Goal,
  Objective,
  Recipient,
  User,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
} from '..';
import { OBJECTIVE_STATUS } from '../../constants';
import { preventCloseIfObjectivesOpen } from './goalStatusChange';

const fakeName = faker.name.firstName() + faker.name.lastName();

describe('GoalStatusChange hooks', () => {
  afterAll(async () => {
    await sequelize.close();
  });
  describe('implicit testing', () => {
    let grant;
    let goal;
    let user;
    let goalStatusChange;
    let recipient;
    let objective1;
    let objective2;
    let objective3;

    const mockUser = {
      id: faker.datatype.number(),
      homeRegionId: 1,
      name: fakeName,
      hsesUsername: fakeName,
      hsesUserId: faker.datatype.number(),
      lastLogin: new Date(),
    };

    beforeAll(async () => {
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });
      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });
      goal = await Goal.create({
        name: 'Goal for status change hook',
        grantId: grant.id,
        status: 'Draft',
      });
      user = await User.create(mockUser);

      // Create objectives for testing updateObjectiveStatusIfSuspended
      objective1 = await Objective.create({
        title: 'Objective 1',
        goalId: goal.id,
        status: GOAL_STATUS.NOT_STARTED,
      });
      objective2 = await Objective.create({
        title: 'Objective 2',
        goalId: goal.id,
        status: GOAL_STATUS.IN_PROGRESS,
      });
      objective3 = await Objective.create({
        title: 'Objective 3',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.COMPLETE,
      });
    });

    afterAll(async () => {
      await GoalStatusChange.destroy({ where: { id: goalStatusChange.id } });
      await Objective.destroy({ where: { goalId: goal.id }, force: true });
      await User.destroy({ where: { id: user.id } });
      await Goal.destroy({ where: { id: goal.id }, force: true });
      await GrantNumberLink.destroy({ where: { grantId: grant.id }, force: true });
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: recipient.id } });
    });

    describe('afterCreate', () => {
      it('should update the goal status', async () => {
        goalStatusChange = await GoalStatusChange.create({
          goalId: goal.id,
          userId: user.id,
          userName: user.name,
          userRoles: ['a', 'b'],
          newStatus: 'In Progress',
          reason: 'Testing status change',
          context: 'Testing',
        });

        await goalStatusChange.reload();
        await goal.reload();

        expect(goal.status).toBe('In Progress');
      });

      it('should not update the goal status if the status is the same', async () => {
      // Create a GoalStatusChange with the same oldStatus and newStatus
        goalStatusChange = await GoalStatusChange.create({
          goalId: goal.id,
          userId: user.id,
          userName: user.name,
          userRoles: ['a', 'b'],
          oldStatus: 'Draft',
          newStatus: 'Draft', // Intentionally setting the same status
          reason: 'Testing no status change',
          context: 'Testing',
        });

        const previousStatus = goal.status;

        await goalStatusChange.reload();
        await goal.reload();

        // The status should remain unchanged
        expect(goal.status).toBe(previousStatus);
      });

      describe('updateObjectiveStatusIfSuspended', () => {
        it('should suspend NOT_STARTED and IN_PROGRESS objectives when goal is suspended', async () => {
          goalStatusChange = await GoalStatusChange.create({
            goalId: goal.id,
            userId: user.id,
            userName: user.name,
            userRoles: ['a', 'b'],
            oldStatus: GOAL_STATUS.IN_PROGRESS,
            newStatus: GOAL_STATUS.SUSPENDED,
            reason: CLOSE_SUSPEND_REASONS[0],
            context: 'Testing',
          });

          await objective1.reload();
          await objective2.reload();
          await objective3.reload();

          expect(objective1.status).toBe(GOAL_STATUS.SUSPENDED);
          expect(objective2.status).toBe(GOAL_STATUS.SUSPENDED);
          expect(objective3.status).toBe(OBJECTIVE_STATUS.COMPLETE); // Should remain unchanged

          expect(objective1.closeSuspendReason).toBe(CLOSE_SUSPEND_REASONS[0]);
          expect(objective2.closeSuspendReason).toBe(CLOSE_SUSPEND_REASONS[0]);
          expect(objective3.closeSuspendReason).toBeNull();
        });

        it('should not update reason with invalid text', async () => {
        // Reset objectives to original states
          await objective1.update({ status: GOAL_STATUS.NOT_STARTED });
          await objective2.update({ status: GOAL_STATUS.IN_PROGRESS });

          goalStatusChange = await GoalStatusChange.create({
            goalId: goal.id,
            userId: user.id,
            userName: user.name,
            userRoles: ['a', 'b'],
            oldStatus: GOAL_STATUS.IN_PROGRESS,
            newStatus: GOAL_STATUS.SUSPENDED,
            reason: 'random reason',
            context: 'Testing',
          });

          await objective1.reload();
          await objective2.reload();
          await objective3.reload();

          expect(objective1.status).toBe(GOAL_STATUS.SUSPENDED);
          expect(objective2.status).toBe(GOAL_STATUS.SUSPENDED);
          expect(objective3.status).toBe(OBJECTIVE_STATUS.COMPLETE); // Should remain unchanged

          expect(objective1.closeSuspendReason).toBeNull();
          expect(objective2.closeSuspendReason).toBeNull();
          expect(objective3.closeSuspendReason).toBeNull();
        });

        it('should not update objectives when status is not changing to suspended', async () => {
        // Reset objectives to original states
          await objective1.update({ status: GOAL_STATUS.NOT_STARTED });
          await objective2.update({ status: GOAL_STATUS.IN_PROGRESS });

          goalStatusChange = await GoalStatusChange.create({
            goalId: goal.id,
            userId: user.id,
            userName: user.name,
            userRoles: ['a', 'b'],
            oldStatus: GOAL_STATUS.NOT_STARTED,
            newStatus: GOAL_STATUS.IN_PROGRESS,
            reason: CLOSE_SUSPEND_REASONS[0],
            context: 'Testing',
          });

          await objective1.reload();
          await objective2.reload();

          expect(objective1.status).toBe(GOAL_STATUS.NOT_STARTED);
          expect(objective2.status).toBe(GOAL_STATUS.IN_PROGRESS);
        });

        it('should not update objectives when oldStatus equals newStatus', async () => {
        // Reset objectives to original states
          await objective1.update({ status: GOAL_STATUS.NOT_STARTED });
          await objective2.update({ status: GOAL_STATUS.IN_PROGRESS });

          goalStatusChange = await GoalStatusChange.create({
            goalId: goal.id,
            userId: user.id,
            userName: user.name,
            userRoles: ['a', 'b'],
            oldStatus: GOAL_STATUS.SUSPENDED,
            newStatus: GOAL_STATUS.SUSPENDED,
            reason: 'Testing no change',
            context: 'Testing',
          });

          await objective1.reload();
          await objective2.reload();

          expect(objective1.status).toBe(GOAL_STATUS.NOT_STARTED);
          expect(objective2.status).toBe(GOAL_STATUS.IN_PROGRESS);
        });
      });
    });
  });

  describe('preventCloseIfObjectivesOpen with Data', () => {
    let mockUser;
    let recipient;
    let grant;
    let activityReportApproved;
    let activityReportUnApproved;
    let goal;
    let objectiveArApproved;
    let objectiveArUnApproved;
    let objectiveRTR;

    beforeAll(async () => {
      mockUser = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 10000, max: 100000 }),
        name: faker.datatype.string(),
        number: faker.datatype.number({ min: 10000, max: 100000 }),
      });

      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
      });

      goal = await Goal.create({
        name: faker.datatype.string(),
        status: GOAL_STATUS.IN_PROGRESS,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      objectiveArApproved = await Objective.create({
        name: faker.datatype.string(),
        status: OBJECTIVE_STATUS.COMPLETE,
        goalId: goal.id,
        createdVia: 'activityReport',
        activityReportId: null,
      });
      objectiveArUnApproved = await Objective.create({
        name: faker.datatype.string(),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        goalId: goal.id,
        createdVia: 'activityReport',
        activityReportId: null,
      });

      objectiveRTR = await Objective.create({
        name: faker.datatype.string(),
        status: OBJECTIVE_STATUS.COMPLETE,
        goalId: goal.id,
        createdVia: 'rtr',
        activityReportId: null,
      });

      activityReportApproved = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.APPROVED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
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
        activityReportId: activityReportApproved.id,
        goalId: goal.id,
      });

      await ActivityReportObjective.create({
        activityReportId: activityReportApproved.id,
        objectiveId: objectiveArApproved.id,
      });

      activityReportUnApproved = await ActivityReport.create({
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

      await ActivityReportGoal.create({
        activityReportId: activityReportUnApproved.id,
        goalId: goal.id,
      });

      await ActivityReportObjective.create({
        activityReportId: activityReportUnApproved.id,
        objectiveId: objectiveArUnApproved.id,
      });
    });

    afterAll(async () => {
    // Destroy activity report objectives.
      await ActivityReportObjective.destroy({
        where: { activityReportId: [activityReportApproved.id, activityReportUnApproved.id] },
        force: true,
      });

      // Destroy activity report goals.
      await ActivityReportGoal.destroy({
        where: { activityReportId: [activityReportApproved.id, activityReportUnApproved.id] },
        force: true,
      });

      // Destroy activity reports.
      await ActivityReport.destroy({
        where: { id: [activityReportApproved.id, activityReportUnApproved.id] },
        force: true,
      });

      // Destroy objectives.
      await Objective.destroy({
        where: { id: [objectiveArApproved.id, objectiveArUnApproved.id, objectiveRTR.id] },
        force: true,
      });

      // Destroy the Goal.
      await Goal.destroy({
        where: { id: goal.id },
        force: true,
      });

      // Destroy grant.
      await Grant.destroy({
        where: { id: grant.id },
        force: true,
        individualHooks: true,
      });

      // Destroy recipient.
      await Recipient.destroy({
        where: { id: recipient.id },
      });

      // Destroy mock user.
      await User.destroy({
        where: { id: mockUser.id },
      });
    });

    it('correctly detects open objectives and finds objectives linked to unapproved reports preventing the close', async () => {
    // Set the status of the objective objectiveArApproved to IN_PROGRESS.
      await objectiveArApproved.update({ status: OBJECTIVE_STATUS.IN_PROGRESS });

      // Set the status of the goal to CLOSED to trigger the hook.
      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
        goalId: goal.id,
        get: () => GOAL_STATUS.CLOSED,
      };
      // Call the function with the instance and real sequelize object
      await expect(preventCloseIfObjectivesOpen(sequelize, instance)).rejects.toThrow(
        `Cannot close a goal ${goal.id} with open objectives. ${objectiveArApproved.id} is open.`,
      );
    });

    it('correctly detects open objectives and ignores objectives linked to unapproved reports allowing the close', async () => {
    // Set the status of the objective objectiveArApproved to COMPLETE.
      await objectiveArApproved.update({ status: OBJECTIVE_STATUS.COMPLETE });

      // Set the status of the goal to CLOSED to trigger the hook.
      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
        goalId: goal.id,
        get: () => GOAL_STATUS.CLOSED,
      };
      // Call the function with the instance and real sequelize object
      await expect(preventCloseIfObjectivesOpen(sequelize, instance)).resolves.not.toThrow();
    });

    it('allows closing a goal when RTR objective is in progress but AR objective is complete', async () => {
    // Ensure AR objective is complete
      await objectiveArApproved.update({ status: OBJECTIVE_STATUS.COMPLETE });

      // Set RTR objective to IN_PROGRESS
      await objectiveRTR.update({ status: OBJECTIVE_STATUS.IN_PROGRESS });

      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
        goalId: goal.id,
        get: () => GOAL_STATUS.CLOSED,
      };

      // Should throw because RTR objectives should not be ignored when closing goals
      await expect(preventCloseIfObjectivesOpen(sequelize, instance)).rejects.toThrow(
        `Cannot close a goal ${goal.id} with open objectives. ${objectiveRTR.id} is open.`,
      );

      // Reset RTR objective status
      await objectiveRTR.update({ status: OBJECTIVE_STATUS.COMPLETE });
    });

    it('allows closing a goal when all approved AR objectives are suspended', async () => {
    // Set the AR objective to SUSPENDED (which should allow goal to be closed)
      await objectiveArApproved.update({ status: OBJECTIVE_STATUS.SUSPENDED });

      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
        goalId: goal.id,
      };

      // Should not throw since SUSPENDED objectives are not considered acceptable for closing
      await expect(preventCloseIfObjectivesOpen(sequelize, instance)).rejects.toThrow();

      // Reset objective status
      await objectiveArApproved.update({ status: OBJECTIVE_STATUS.COMPLETE });
    });

    it('correctly handles a mix of objective statuses', async () => {
    // Create an additional approved AR objective for testing mixed statuses
      const mixedStatusObjective = await Objective.create({
        name: faker.datatype.string(),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        goalId: goal.id,
        createdVia: 'activityReport',
        activityReportId: null,
      });

      const mixedStatusAR = await ActivityReport.create({
        userId: mockUser.id,
        regionId: 1,
        submissionStatus: REPORT_STATUSES.APPROVED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
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
        activityReportId: mixedStatusAR.id,
        goalId: goal.id,
      });

      await ActivityReportObjective.create({
        activityReportId: mixedStatusAR.id,
        objectiveId: mixedStatusObjective.id,
      });

      // Set other objectives to COMPLETE or SUSPENDED
      await objectiveArApproved.update({ status: OBJECTIVE_STATUS.COMPLETE });
      await objectiveRTR.update({ status: OBJECTIVE_STATUS.SUSPENDED });

      // Set the goal to CLOSED to trigger the hook
      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
        goalId: goal.id,
        get: () => GOAL_STATUS.CLOSED,
      };

      // Should throw because we have one IN_PROGRESS objective on approved AR
      await expect(preventCloseIfObjectivesOpen(sequelize, instance)).rejects.toThrow(
        `Cannot close a goal ${goal.id} with open objectives. ${mixedStatusObjective.id} is open.`,
      );

      // Clean up
      await ActivityReportObjective.destroy({
        where: { activityReportId: mixedStatusAR.id },
        force: true,
      });

      await ActivityReportGoal.destroy({
        where: { activityReportId: mixedStatusAR.id },
        force: true,
      });

      await ActivityReport.destroy({
        where: { id: mixedStatusAR.id },
        force: true,
      });

      await Objective.destroy({
        where: { id: mixedStatusObjective.id },
        force: true,
      });
    });
  });
});
