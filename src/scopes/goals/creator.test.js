import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { CollaboratorType, Goal, GoalCollaborator, GoalTemplate, Grant, Recipient } from '../../models';
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
    let monitoringTemplate;
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

      monitoringTemplate = await GoalTemplate.findOne({ where: { standard: 'Monitoring' } });
      if (!monitoringTemplate) throw new Error('No Monitoring template found — seeders may not have run');

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
        createdVia: 'rtr',
        goalTemplateId: monitoringTemplate.id,
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
      // confirm the returned goal uses a non-monitoring template (createdVia rtr, non-monitoring template)
      expect(found[0].goalTemplateId).not.toEqual(monitoringTemplate.id);
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

    it('ctn does not return extra goals when a SQL injection payload is used as the creator name', async () => {
      const injectedInput = ["' OR '1'='1"];
      const filters = { 'goalCreator.ctn': injectedInput };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [scope, { id: availableGoalIds }],
        },
      });

      expect(found.length).toEqual(0);
    });

    it('nctn does not return extra goals when a SQL injection payload is used as the creator name', async () => {
      const injectedInput = ["' OR '1'='1"];
      const filters = { 'goalCreator.nctn': injectedInput };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [scope, { id: availableGoalIds }],
        },
      });

      // The injection is escaped, so no user name matches — the NOT IN sub-query is empty,
      // meaning all non-monitoring goals are returned (both rtr goals). If injection had
      // succeeded, the sub-query would return all goalIds and NOT IN would yield 0 results.
      const foundIds = found.map(({ id }) => id).sort();
      expect(foundIds).toEqual([goalWithCreator.id, goalWithoutCreator.id].sort());
    });
  });
});
