import faker from '@faker-js/faker';
import { CLOSE_SUSPEND_REASONS, REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';
import db, { Goal, Grant, Objective, Recipient, Region } from '../models';
import { closeGoalsFromAdmin } from '../routes/admin/goal';
import transactionWrapper from '../routes/transactionWrapper';
import { createGrant, createRecipient, createReport, destroyReport } from '../testUtils';
import { closeMultiRecipientGoalsFromAdmin } from './goals';

describe('closeMultiRecipientGoalsFromAdmin', () => {
  let region;
  let grant;
  let recipient;
  let goals;
  let activeGoal;
  let activeGoalObjective;
  let activeReport;
  let approvedObjectiveInProgress;
  let objectiveNotOnApprovedAr;

  beforeAll(async () => {
    const regionId = faker.datatype.number({ min: 999 });
    region = await Region.create({
      id: regionId,
      name: `Region ${regionId}`,
    });
    recipient = await createRecipient();
    grant = await createGrant({ regionId: region.id, recipientId: recipient.id });

    goals = await Promise.all([
      Goal.create({
        name: faker.datatype.string(999),
        status: GOAL_STATUS.NOT_STARTED,
        grantId: grant.id,
        onAR: true,
        onApprovedAR: false,
      }),
      Goal.create({
        name: faker.datatype.string(999),
        status: GOAL_STATUS.NOT_STARTED,
        grantId: grant.id,
        onAR: true,
        onApprovedAR: false,
      }),
      Goal.create({
        name: faker.datatype.string(999),
        status: GOAL_STATUS.SUSPENDED,
        grantId: grant.id,
        onAR: true,
        onApprovedAR: false,
      }),
    ]);

    const objectives = await Objective.bulkCreate([
      {
        goalId: goals[0].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[0].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[1].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[1].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.COMPLETE,
        onAR: true,
        onApprovedAR: false,
      },
      {
        goalId: goals[2].id,
        title: faker.datatype.string(999),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        onAR: true,
        onApprovedAR: false,
      },
    ]);
    [approvedObjectiveInProgress] = objectives;

    await Objective.update(
      { onApprovedAR: true },
      { where: { id: objectives.map((objective) => objective.id) } }
    );

    objectiveNotOnApprovedAr = await Objective.create({
      goalId: goals[1].id,
      title: faker.datatype.string(999),
      status: OBJECTIVE_STATUS.NOT_STARTED,
      onAR: true,
      onApprovedAR: false,
    });
    activeGoal = await Goal.create({
      name: faker.datatype.string(999),
      status: GOAL_STATUS.NOT_STARTED,
      grantId: grant.id,
      onAR: true,
      onApprovedAR: false,
    });
    activeGoalObjective = await Objective.create({
      goalId: activeGoal.id,
      title: faker.datatype.string(999),
      status: OBJECTIVE_STATUS.IN_PROGRESS,
      onAR: true,
      onApprovedAR: true,
    });
    activeReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.DRAFT,
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: grant.regionId,
    });
    await db.ActivityReportGoal.create({
      activityReportId: activeReport.id,
      goalId: activeGoal.id,
    });
  });

  afterAll(async () => {
    if (activeReport) {
      await db.ActivityReportGoal.destroy({
        where: {
          activityReportId: activeReport.id,
        },
      });
      await destroyReport(activeReport);
    }
    const goalIds = [...(goals || []).map((goal) => goal.id), activeGoal?.id].filter(Boolean);
    await Objective.destroy({ where: { goalId: goalIds }, force: true });
    await Goal.destroy({ where: { id: goalIds }, force: true });
    await Grant.destroy({ where: { id: grant.id }, force: true, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id }, force: true });
    await Region.destroy({ where: { id: region.id }, force: true });
    await db.sequelize.close();
  });

  it('blocks before mutating objectives when a goal is on an active report', async () => {
    const data = {
      selectedGoal: {
        goalIds: [activeGoal.id],
        status: GOAL_STATUS.NOT_STARTED,
      },
      closeSuspendContext: 'This is some appropriate context',
      closeSuspendReason: CLOSE_SUSPEND_REASONS[0],
    };

    await expect(closeMultiRecipientGoalsFromAdmin(data, 1)).rejects.toMatchObject({
      code: 'GOAL_STATUS_CHANGE_BLOCKED',
      reasons: ['ACTIVE_ACTIVITY_REPORT'],
    });

    await Promise.all([activeGoal.reload(), activeGoalObjective.reload()]);
    expect(activeGoal.status).toBe(GOAL_STATUS.NOT_STARTED);
    expect(activeGoalObjective.status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
  });

  it('rolls back objective updates when the admin route returns a conflict', async () => {
    const data = {
      selectedGoal: {
        goalIds: [activeGoal.id],
        status: GOAL_STATUS.NOT_STARTED,
      },
      closeSuspendContext: 'This is some appropriate context',
      closeSuspendReason: CLOSE_SUSPEND_REASONS[0],
    };
    const json = jest.fn();
    const req = {
      body: data,
      session: { userId: 1 },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await transactionWrapper(closeGoalsFromAdmin)(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      code: 'GOAL_STATUS_CHANGE_BLOCKED',
      reasons: ['ACTIVE_ACTIVITY_REPORT'],
    });
    await Promise.all([activeGoal.reload(), activeGoalObjective.reload()]);
    expect(activeGoal.status).toBe(GOAL_STATUS.NOT_STARTED);
    expect(activeGoalObjective.status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
  });

  it('does not complete eligible objectives when another objective blocks admin closure', async () => {
    const data = {
      selectedGoal: {
        goalIds: [goals[0].id, goals[1].id],
        status: GOAL_STATUS.NOT_STARTED,
      },
      closeSuspendContext: 'This is some appropriate context',
      closeSuspendReason: CLOSE_SUSPEND_REASONS[0],
    };
    const json = jest.fn();
    const req = {
      body: data,
      session: { userId: 1 },
    };
    const res = {
      status: jest.fn(() => ({ json })),
    };

    await transactionWrapper(closeGoalsFromAdmin)(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      code: 'GOAL_STATUS_CHANGE_BLOCKED',
      reasons: ['INCOMPLETE_OBJECTIVES'],
    });
    await approvedObjectiveInProgress.reload();
    expect(approvedObjectiveInProgress.status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
  });

  it('updates goals and objectives based on admin request', async () => {
    const data = {
      selectedGoal: {
        goalIds: [goals[0].id, goals[1].id],
        status: GOAL_STATUS.NOT_STARTED,
      },
      closeSuspendContext: 'This is some appropriate context',
      closeSuspendReason: CLOSE_SUSPEND_REASONS[0],
    };

    // expect the first try to throw
    await expect(closeMultiRecipientGoalsFromAdmin(data, 1)).rejects.toThrow();

    // now we update all the objectives to be on an approved AR
    await Objective.update(
      { onApprovedAR: true },
      { where: { goalId: goals.map((goal) => goal.id) } }
    );

    // then we try again
    const response = await closeMultiRecipientGoalsFromAdmin(data, 1);
    expect(response.isError).toBe(false);
    expect(response.goals.length).toBe(2);

    const updatedGoals = await Goal.findAll({
      attributes: ['id', 'status'],
      where: {
        id: response.goals.map((goal) => goal.id),
      },
      include: [
        {
          attributes: [
            'id',
            'status',
            'onApprovedAR',
            'goalId',
            'closeSuspendReason',
            'closeSuspendContext',
          ],
          model: Objective,
          as: 'objectives',
        },
      ],
    });

    updatedGoals.forEach((updatedGoal) => {
      expect(updatedGoal.status).toBe(GOAL_STATUS.CLOSED);
      updatedGoal.objectives.forEach((objective) => {
        const expectedStatus = objective.onApprovedAR
          ? OBJECTIVE_STATUS.COMPLETE
          : objectiveNotOnApprovedAr.status;
        const expectedSuspendReason = objective.onApprovedAR ? data.closeSuspendReason : null;
        const expectedSuspendContext = objective.onApprovedAR ? data.closeSuspendContext : null;
        expect(objective.status).toBe(expectedStatus);
        expect(objective.closeSuspendReason).toBe(expectedSuspendReason);
        expect(objective.closeSuspendContext).toBe(expectedSuspendContext);
      });
    });

    // no objectives should have survived as it was not on an approved AR
    const aloneObjective = await Objective.findOne({
      attributes: [
        'id',
        'status',
        'onApprovedAR',
        'goalId',
        'closeSuspendContext',
        'closeSuspendReason',
      ],
      where: {
        goalId: [goals[0].id, goals[1].id],
        status: {
          [Op.not]: OBJECTIVE_STATUS.COMPLETE,
        },
      },
    });

    expect(aloneObjective).toBe(null);

    // we left goal 2 alone
    const goal2 = await Goal.findOne({
      attributes: ['id', 'status'],
      where: {
        id: goals[2].id,
      },
    });

    expect(goal2.status).toBe(GOAL_STATUS.SUSPENDED);

    // and it's objectives
    const goal2Objectives = await Objective.findAll({
      attributes: ['id', 'goalId', 'status'],
      where: {
        goalId: goals[2].id,
      },
    });

    goal2Objectives.forEach((objective) => {
      expect(objective.status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
    });
  });
});
