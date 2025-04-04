import faker from '@faker-js/faker';
import db, {
  Goal,
  GoalStatusChange,
  Objective,
  Recipient,
  Grant,
  GrantNumberLink,
  User,
} from '..';
import { OBJECTIVE_STATUS } from '../../constants';

jest.mock('bull');

const mockUserId = faker.datatype.number();

jest.mock('express-http-context', () => {
  const httpContext = jest.requireActual('express-http-context');
  httpContext.get = jest.fn(() => mockUserId);
  return httpContext;
});

const fakeName = faker.name.firstName() + faker.name.lastName();
const mockUser = {
  id: mockUserId,
  homeRegionId: 1,
  name: fakeName,
  hsesUsername: fakeName,
  hsesUserId: fakeName,
  lastLogin: new Date(),
};

describe('objective model hooks', () => {
  let recipient;
  let grant;
  let goal;
  let user;

  let objective1;
  let objective2;
  let objective3;

  beforeAll(async () => {
    user = await User.create(mockUser);
    recipient = await Recipient.create({
      id: faker.datatype.number(),
      name: faker.name.firstName(),
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
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grant.id,
      createdVia: 'rtr',
    });
  });

  afterAll(async () => {
    await Objective.destroy({
      where: {
        id: [objective1.id, objective2.id, objective3.id],
      },
      force: true,
    });

    await Goal.destroy({
      where: {
        id: goal.id,
      },
      force: true,
    });

    await GrantNumberLink.destroy({
      where: { grantId: grant.id },
      force: true,
    });

    await Grant.destroy({
      where: {
        id: grant.id,
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('does not update when the goal does not match the qualifications', async () => {
    objective1 = await Objective.create({
      title: 'Objective 1',
      goalId: goal.id,
      status: OBJECTIVE_STATUS.DRAFT,
    }, { individualHooks: true });

    let testGoal = await Goal.findByPk(goal.id);
    expect(testGoal.status).toEqual('Draft');

    await Objective.update({ status: OBJECTIVE_STATUS.IN_PROGRESS }, {
      where: {
        id: objective1.id,
      },
      individualHooks: true,
    });

    testGoal = await Goal.findByPk(goal.id);
    expect(testGoal.status).toEqual('Draft');

    await Objective.destroy({ where: { id: objective1.id }, force: true });
  });

  it('updates when the goal matches the qualifications', async () => {
    let testGoal = await Goal.findByPk(goal.id);
    expect(testGoal.status).toEqual('Draft');
    expect(testGoal.id).toEqual(goal.id);

    await GoalStatusChange.create({
      goalId: goal.id,
      userId: user.id,
      userName: user.name,
      userRoles: ['a', 'b'],
      oldStatus: 'Draft',
      newStatus: 'Not Started',
      reason: 'Just because',
      context: 'Testing',
    });

    objective2 = await Objective.create({
      title: 'Objective 2',
      goalId: goal.id,
      status: OBJECTIVE_STATUS.NOT_STARTED,
    }, { individualHooks: true });
    objective3 = await Objective.create({
      title: 'Objective 3',
      goalId: goal.id,
      status: OBJECTIVE_STATUS.NOT_STARTED,
    }, { individualHooks: true });

    testGoal = await Goal.findByPk(goal.id);
    expect(testGoal.status).toEqual('Not Started');

    await Objective.update({ status: OBJECTIVE_STATUS.IN_PROGRESS }, {
      where: {
        id: objective2.id,
      },
      individualHooks: true,
    });

    testGoal = await Goal.findByPk(goal.id);
    expect(testGoal.status).toEqual('In Progress');

    await Objective.update({ status: OBJECTIVE_STATUS.COMPLETE }, {
      where: { id: [objective3.id, objective2.id] },
      individualHooks: true,
    });

    testGoal = await Goal.findByPk(goal.id);
    expect(testGoal.status).toEqual('In Progress');
  });
});
