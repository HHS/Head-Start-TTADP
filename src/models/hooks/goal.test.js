/* eslint-disable global-require */
const { faker } = require('@faker-js/faker');
const { REPORT_STATUSES } = require('@ttahub/common');
const { sequelize } = require('..');
const {
  User,
  Recipient,
  Grant,
  ActivityReport,
  Goal,
  Objective,
  ActivityReportGoal,
  ActivityReportObjective,
} = require('..');
const {
  processForEmbeddedResources,
  findOrCreateGoalTemplate,
  preventCloseIfObjectivesOpen,
  beforeCreate,
} = require('./goal');
const { GOAL_STATUS, OBJECTIVE_STATUS } = require('../../constants');

jest.mock('../../services/resource');

describe('goal hooks', () => {
  describe('beforeCreate', () => {
    it('does nothing if instance already has goalTemplateId', async () => {
      const instanceSet = jest.fn();
      const instance = {
        goalTemplateId: 1,
        set: instanceSet,
      };
      await expect(beforeCreate({}, instance)).resolves.not.toThrow();
      expect(instanceSet).not.toHaveBeenCalled();
    });

    it('does nothing if sequelize cannot find a curated template', async () => {
      const instanceSet = jest.fn();
      const instance = {
        goalTemplateId: null,
        set: instanceSet,
      };
      const sequelizeToPass = {
        fn: jest.fn(),
        models: {
          GoalTemplate: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      };
      await expect(beforeCreate(sequelizeToPass, instance)).resolves.not.toThrow();
      expect(instanceSet).not.toHaveBeenCalled();
    });
  });

  describe('preventCloseIfObjectivesOpen', () => {
    it('does nothing if instance.changed is not an array', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue({}),
      };
      await expect(preventCloseIfObjectivesOpen({}, instance)).resolves.not.toThrow();
    });

    it('does nothing is instance.changed does not include status', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue(false),
      };
      await expect(preventCloseIfObjectivesOpen({}, instance)).resolves.not.toThrow();
    });
    it('does nothing if status is not CLOSED', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue(true),
        status: GOAL_STATUS.IN_PROGRESS,
      };
      await expect(preventCloseIfObjectivesOpen({}, instance)).resolves.not.toThrow();
    });

    it('throws an error if status is CLOSED and objectives are not closed', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
      };
      const sequelizeToPass = {
        models: {
          Objective: {
            findAll: jest.fn().mockResolvedValue([
              { status: OBJECTIVE_STATUS.IN_PROGRESS },
            ]),
          },
        },
      };
      await expect(preventCloseIfObjectivesOpen(sequelizeToPass, instance)).rejects.toThrow();
    });
  });

  describe('processForEmbeddedResources', () => {
    const sequelizeToPass = {};
    const instance = {
      id: 1,
      changed: jest.fn(),
    };

    afterEach(() => jest.clearAllMocks());

    it('should call processGoalForResourcesById if auto detection is true', async () => {
      const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
      calculateIsAutoDetectedForGoal.mockReturnValueOnce(true);
      await processForEmbeddedResources(sequelizeToPass, instance);
      expect(processGoalForResourcesById).toHaveBeenCalledWith(instance.id);
    });

    it('should not call processGoalForResourcesById if auto detection is false', async () => {
      const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
      calculateIsAutoDetectedForGoal.mockReturnValueOnce(false);
      await processForEmbeddedResources(sequelize, instance);
      expect(processGoalForResourcesById).not.toHaveBeenCalled();
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
      id: goal.id,
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
      id: goal.id,
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
      id: goal.id,
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
      id: goal.id,
    };

    // Should not throw since SUSPENDED objectives are considered acceptable for closing
    await expect(preventCloseIfObjectivesOpen(sequelize, instance)).resolves.not.toThrow();

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
      id: goal.id,
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
