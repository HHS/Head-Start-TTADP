import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { createGoal, createGrant, createRecipient } from '../../testUtils';
import filtersToScopes from '../index';
import {
  Goal,
  Grant,
  Recipient,
} from '../../models';
import { GOAL_STATUS } from '../../constants';

describe('goal filtersToScopes', () => {
  describe('goalName', () => {
    let includedGoal;
    let excludedGoal;
    let greatGrant;
    let recipient;

    const includedGoalName = `${faker.lorem.sentences(5)}INCLUDED`;
    const excludedGoalName = `${faker.lorem.sentences(5)}EXCLUDED`;

    let availableGoalIds;

    beforeAll(async () => {
      recipient = await createRecipient();
      greatGrant = await createGrant({ recipientId: recipient.id });

      includedGoal = await createGoal({
        grantId: greatGrant.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: includedGoalName,
      });
      excludedGoal = await createGoal({
        grantId: greatGrant.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: excludedGoalName,
      });

      availableGoalIds = [includedGoal.id, excludedGoal.id];
    });

    afterAll(async () => {
      await Goal.destroy({
        where: {
          id: [includedGoal.id, excludedGoal.id],
        },
        force: true,
      });

      await Grant.destroy({
        where: {
          id: greatGrant.id,
        },
        individualHooks: true,
      });

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('in', async () => {
      const filters = { 'goalName.ctn': includedGoalName };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: availableGoalIds,
            },
          ],
        },
      });

      expect(found.length).toEqual(1);
      expect(found[0].id).toEqual(includedGoal.id);
    });
    it('not in', async () => {
      const filters = { 'goalName.nctn': includedGoalName };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: availableGoalIds,
            },
          ],
        },
      });

      expect(found.length).toEqual(1);
      expect(found[0].id).not.toEqual(includedGoal.id);
      expect(found[0].id).toEqual(excludedGoal.id);
    });
  });
});
