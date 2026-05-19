import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { CollaboratorType, Goal, GoalCollaborator, Grant, Recipient } from '../../models';
import { createGoal, createGrant, createRecipient, createUser } from '../../testUtils';
import filtersToScopes from '../index';

describe('goal filtersToScopes', () => {
  describe('goalCreator', () => {
    let creatorUser;
    let otherUser;
    let creatorCollabType;
    let goalWithCreator;
    let goalWithoutCreator;
    let monitoringGoal;
    let grant;
    let recipient;
    let availableGoalIds;

    const creatorName = `Creator ${faker.lorem.word()} ${faker.datatype.uuid()}`;
    const otherCreatorName = `Other ${faker.lorem.word()} ${faker.datatype.uuid()}`;

    beforeAll(async () => {
      recipient = await createRecipient();
      grant = await createGrant({ recipientId: recipient.id });

      creatorUser = await createUser({ name: creatorName });
      otherUser = await createUser({ name: otherCreatorName });

      creatorCollabType = (
        await CollaboratorType.findOrCreate({
          where: { name: 'Creator' },
          defaults: { name: 'Creator', validForId: 1 },
        })
      )[0];

      goalWithCreator = await createGoal({
        grantId: grant.id,
        status: 'Not Started',
        createdVia: 'rtr',
      });

      goalWithoutCreator = await createGoal({
        grantId: grant.id,
        status: 'Not Started',
        createdVia: 'rtr',
      });

      monitoringGoal = await createGoal({
        grantId: grant.id,
        status: 'Not Started',
        createdVia: 'monitoring',
      });

      await GoalCollaborator.create({
        goalId: goalWithCreator.id,
        userId: creatorUser.id,
        collaboratorTypeId: creatorCollabType.id,
      });

      await GoalCollaborator.create({
        goalId: goalWithoutCreator.id,
        userId: otherUser.id,
        collaboratorTypeId: creatorCollabType.id,
      });

      // monitoring goal also has the matching creator — should still be excluded
      await GoalCollaborator.create({
        goalId: monitoringGoal.id,
        userId: creatorUser.id,
        collaboratorTypeId: creatorCollabType.id,
      });

      availableGoalIds = [goalWithCreator.id, goalWithoutCreator.id, monitoringGoal.id];
    });

    afterAll(async () => {
      await GoalCollaborator.destroy({
        where: { goalId: availableGoalIds },
        force: true,
      });

      await Goal.destroy({
        where: { id: availableGoalIds },
        force: true,
        individualHooks: true,
      });

      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
      });

      await Recipient.destroy({
        where: { id: recipient.id },
      });
    });

    it('ctn returns goals whose creator name matches, excluding monitoring goals', async () => {
      const filters = { 'goalCreator.ctn': creatorName };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [scope, { id: availableGoalIds }],
        },
      });

      // monitoringGoal also has creatorUser as collaborator, but must be excluded
      expect(found.length).toEqual(1);
      expect(found[0].id).toEqual(goalWithCreator.id);
    });

    it('nctn returns non-monitoring goals whose creator name does not match', async () => {
      const filters = { 'goalCreator.nctn': creatorName };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [scope, { id: availableGoalIds }],
        },
      });

      // monitoring goal is excluded; only goalWithoutCreator remains
      expect(found.length).toEqual(1);
      expect(found[0].id).toEqual(goalWithoutCreator.id);
    });
  });
});
