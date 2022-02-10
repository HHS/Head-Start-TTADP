import {
  updateGoalStatusById,
} from './goals';
import {
  Goal,
  sequelize,
} from '../models';

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
    const updatedGoal = await updateGoalStatusById(goal.id.toString(), newStatus);
    expect(updatedGoal.status).toEqual(newStatus);
  });
});
