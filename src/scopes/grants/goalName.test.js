import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import {
  Goal,
  Grant,
  Recipient,
  sequelize,
} from '../../models';
import { createGoal, createGrant, createRecipient } from '../../testUtils';
import filtersToScopes from '../index';
import { GOAL_STATUS } from '../../constants';

describe('goalName', () => {
  const goalNameIncluded = `${faker.lorem.sentences(5)}_pig`;
  const goalNameExcluded = `${faker.lorem.sentences(5)}_dog`;

  let recipientForGoalName;
  let grantForGoalExcluded;
  let grantForGoalIncluded;

  let goalNameFilterPossibleIds;

  beforeAll(async () => {
    recipientForGoalName = await createRecipient();
    grantForGoalExcluded = await createGrant({ recipientId: recipientForGoalName.id });
    grantForGoalIncluded = await createGrant({ recipientId: recipientForGoalName.id });
    goalNameFilterPossibleIds = [grantForGoalIncluded.id, grantForGoalExcluded.id];
    await createGoal({
      grantId: grantForGoalIncluded.id,
      name: goalNameIncluded,
      status: GOAL_STATUS.NOT_STARTED,
    });

    await createGoal({
      grantId: grantForGoalExcluded.id,
      name: goalNameExcluded,
      status: GOAL_STATUS.NOT_STARTED,
    });
  });

  afterAll(async () => {
    await Goal.destroy({
      where: {
        grantId: [grantForGoalIncluded.id, grantForGoalExcluded.id],
      },
      force: true,
    });

    await Grant.destroy({
      where: {
        id: [grantForGoalIncluded.id, grantForGoalExcluded.id],
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: recipientForGoalName.id,
      },
    });

    await sequelize.close();
  });

  it('filters by', async () => {
    const filters = { 'goalName.ctn': '_pig' };
    const scope = await filtersToScopes(filters);
    const found = await Recipient.findOne({
      include: [
        {
          attributes: ['id'],
          model: Grant.unscoped(),
          as: 'grants',
          required: true,
          where: { [Op.and]: [scope.grant.where, { id: goalNameFilterPossibleIds }] },
          include: scope.grant.include,
        },
      ],
    });

    expect(found).toBeTruthy();
    expect(found.grants.length).toBe(1);
    expect(found.grants.map((f) => f.id)).toContain(grantForGoalIncluded.id);
  });

  it('filters out', async () => {
    const filters = { 'goalName.nctn': '_pig' };
    const scope = await filtersToScopes(filters);
    const found = await Recipient.findOne({
      include: [
        {
          attributes: ['id'],
          model: Grant.unscoped(),
          as: 'grants',
          required: true,
          where: { [Op.and]: [scope.grant.where, { id: goalNameFilterPossibleIds }] },
          include: scope.grant.include,
        },
      ],
    });
    expect(found).toBeTruthy();
    expect(found.grants.length).toBe(1);
    expect(found.grants.map((f) => f.id)).toContain(grantForGoalExcluded.id);
  });
});
