import {
  updateGoalStatusById,
} from '../goals';
import {
  Goal,
  sequelize,
} from '../../models';

/* TODO:
   Once we determine who has permission to update a goal.
   We can update the function and enable the test.
*/
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Change Goal Status', () => {
  let goal;
  beforeAll(async () => {
    // Create Goal.
    goal = await Goal.create({
      name: 'Goal with Objectives',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
    });
  });
  afterAll(async () => {
    // Cleanup Goal.
    await Goal.destroy({
      where: {
        id: goal.id,
      },
    });
    await sequelize.close();
  });
  it('Updates goal status', async () => {
    const newStatus = 'In Progress';
    const oldStatus = 'Not Started';
    const updatedGoal = await updateGoalStatusById(goal.id.toString(), newStatus, oldStatus);
    expect(updatedGoal.status).toEqual(newStatus);
    expect(updatedGoal.closeSuspendReason).toEqual(null);
    expect(updatedGoal.closeSuspendContext).toEqual(null);
    expect(updatedGoal.previousStatus).toEqual(oldStatus);
  });

  it('Updates goal status with reason', async () => {
    const newStatus = 'Complete';
    const oldStatus = 'In Progress';
    const reason = 'TTA complete';
    const context = 'This goal has been completed.';
    const updatedGoal = await updateGoalStatusById(
      goal.id.toString(),
      newStatus,
      oldStatus,
      reason,
      context,
    );
    expect(updatedGoal.status).toEqual(newStatus);
    expect(updatedGoal.closeSuspendReason).toEqual(reason);
    expect(updatedGoal.closeSuspendContext).toEqual(context);
    expect(updatedGoal.previousStatus).toEqual(oldStatus);
  });
});
