import {
  createGoal,
  createGrant,
  filtersToScopes,
  Goal,
  Op,
  sequelize,
} from './testHelpers';
import { GoalStatusChange } from '../../models';

describe('goals/closedReason', () => {
  let grant;
  let goalRecipientRequest;
  let goalTTAComplete;
  let goalRegionalOffice;
  let goalNoCloseReason;
  const createdGoalIds = [];
  const createdStatusChangeIds = [];

  beforeAll(async () => {
    grant = await createGrant();

    goalRecipientRequest = await createGoal({ grantId: grant.id, name: 'Recipient request goal', status: 'Not Started' });
    createdGoalIds.push(goalRecipientRequest.id);

    goalTTAComplete = await createGoal({ grantId: grant.id, name: 'TTA complete goal', status: 'Not Started' });
    createdGoalIds.push(goalTTAComplete.id);

    goalRegionalOffice = await createGoal({ grantId: grant.id, name: 'Regional Office goal', status: 'Not Started' });
    createdGoalIds.push(goalRegionalOffice.id);

    goalNoCloseReason = await createGoal({ grantId: grant.id, name: 'No close reason goal', status: 'Not Started' });
    createdGoalIds.push(goalNoCloseReason.id);

    const sc1 = await GoalStatusChange.create({
      goalId: goalRecipientRequest.id,
      userName: 'Test User',
      userRoles: [],
      oldStatus: 'Not Started',
      newStatus: 'Closed',
      reason: 'Recipient request',
    });
    createdStatusChangeIds.push(sc1.id);

    const sc2 = await GoalStatusChange.create({
      goalId: goalTTAComplete.id,
      userName: 'Test User',
      userRoles: [],
      oldStatus: 'Not Started',
      newStatus: 'Closed',
      reason: 'TTA complete',
    });
    createdStatusChangeIds.push(sc2.id);

    const sc3 = await GoalStatusChange.create({
      goalId: goalRegionalOffice.id,
      userName: 'Test User',
      userRoles: [],
      oldStatus: 'Not Started',
      newStatus: 'Closed',
      reason: 'Regional Office request',
    });
    createdStatusChangeIds.push(sc3.id);
  });

  afterAll(async () => {
    if (createdStatusChangeIds.length) {
      await GoalStatusChange.destroy({ where: { id: createdStatusChangeIds } });
    }
    if (createdGoalIds.length) {
      await Goal.destroy({ where: { id: createdGoalIds }, force: true, individualHooks: true });
    }
    if (grant) {
      const { recipientId } = grant;
      await sequelize.models.Grant.destroy({
        where: { id: grant.id },
        force: true,
        individualHooks: true,
      });
      if (recipientId) {
        await sequelize.models.Recipient.destroy({
          where: { id: recipientId },
          force: true,
          individualHooks: true,
        });
      }
    }
    await sequelize.close();
  });

  it('returns goals matching a single closed reason', async () => {
    const { goal: scope } = await filtersToScopes({ 'closedReason.in': ['Recipient request'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).toContain(goalRecipientRequest.id);
    expect(foundIds).not.toContain(goalTTAComplete.id);
    expect(foundIds).not.toContain(goalNoCloseReason.id);
  });

  it('returns goals matching multiple closed reasons', async () => {
    const { goal: scope } = await filtersToScopes({
      'closedReason.in': ['Recipient request', 'TTA complete'],
    });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).toContain(goalRecipientRequest.id);
    expect(foundIds).toContain(goalTTAComplete.id);
    expect(foundIds).not.toContain(goalNoCloseReason.id);
  });

  it('only returns closed goals when using the in filter', async () => {
    const goalOpen = await createGoal({ grantId: grant.id, name: 'Open goal for in test', status: 'In Progress' });
    createdGoalIds.push(goalOpen.id);

    const { goal: scope } = await filtersToScopes({ 'closedReason.in': ['Recipient request'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).not.toContain(goalOpen.id);
    expect(foundIds).toContain(goalRecipientRequest.id);
  });

  it('excludes goals matching a closed reason and only returns closed goals', async () => {
    const goalOpen = await createGoal({ grantId: grant.id, name: 'Open goal for nin test', status: 'In Progress' });
    createdGoalIds.push(goalOpen.id);

    const { goal: scope } = await filtersToScopes({ 'closedReason.nin': ['Recipient request'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).not.toContain(goalRecipientRequest.id);
    expect(foundIds).toContain(goalTTAComplete.id);
    expect(foundIds).toContain(goalRegionalOffice.id);
    // open goal is excluded even though it has no matching closure reason
    expect(foundIds).not.toContain(goalOpen.id);
    // goal with no close reason at all is also excluded (not a closed goal)
    expect(foundIds).not.toContain(goalNoCloseReason.id);
  });

  it('excludes goals matching multiple closed reasons', async () => {
    const { goal: scope } = await filtersToScopes({
      'closedReason.nin': ['Recipient request', 'TTA complete'],
    });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).not.toContain(goalRecipientRequest.id);
    expect(foundIds).not.toContain(goalTTAComplete.id);
    expect(foundIds).toContain(goalRegionalOffice.id);
    // non-closed goals are excluded even when their reason doesn't match
    expect(foundIds).not.toContain(goalNoCloseReason.id);
  });

  it('does not return a goal that was closed then reopened', async () => {
    const goalReopened = await createGoal({ grantId: grant.id, name: 'Reopened goal', status: 'Not Started' });
    createdGoalIds.push(goalReopened.id);

    const sc1 = await GoalStatusChange.create({
      goalId: goalReopened.id,
      userName: 'Test User',
      userRoles: [],
      oldStatus: 'Not Started',
      newStatus: 'Closed',
      reason: 'Recipient request',
    });
    createdStatusChangeIds.push(sc1.id);

    // Simulate reopen — hook will update goal.status back to 'In Progress'
    const sc2 = await GoalStatusChange.create({
      goalId: goalReopened.id,
      userName: 'Test User',
      userRoles: [],
      oldStatus: 'Closed',
      newStatus: 'In Progress',
      reason: 'Reopened',
    });
    createdStatusChangeIds.push(sc2.id);

    const { goal: scope } = await filtersToScopes({ 'closedReason.in': ['Recipient request'] });
    const found = await Goal.findAll({
      where: { [Op.and]: [scope, { id: createdGoalIds }] },
    });
    const foundIds = found.map((g) => g.id);
    expect(foundIds).not.toContain(goalReopened.id);
    expect(foundIds).toContain(goalRecipientRequest.id);
  });
});
