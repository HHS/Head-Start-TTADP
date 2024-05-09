/* eslint-disable global-require */
const {
  processForEmbeddedResources,
  findOrCreateGoalTemplate,
  onlyAllowTrGoalSourceForGoalsCreatedViaTr,
} = require('./goal');
const { GOAL_STATUS } = require('../../constants');
const { createRecipient, createGrant, createGoal } = require('../../testUtils');
const {
  sequelize: db,
  Grant: GrantModel,
  Recipient: RecipientModel,
  Goal: GoalModel,
  GoalSimilarityGroup: GoalSimilarityGroupModel,
  GoalSimilarityGroupGoal: GoalSimilarityGroupGoalModel,
} = require('..');

jest.mock('../../services/resource');

describe('goal hooks', () => {
  describe('GoalSimilarityGroup hooks', () => {
    let recipient;
    let grant;

    beforeAll(async () => {
      recipient = await createRecipient();
      grant = await createGrant({ recipientId: recipient.id });
    });

    afterEach(() => jest.clearAllMocks());

    it('should invalidate similarity groups on goal creation', async () => {
      await GoalSimilarityGroupModel.create({
        recipientId: recipient.id,
        userHasInvalidated: false,
        finalGoalId: null,
      });
      await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });

      const result = await GoalSimilarityGroupModel.findAll({
        where: {
          recipientId: recipient.id,
          userHasInvalidated: false,
          finalGoalId: null,
        },
      });

      expect(result.length).toEqual(0);
    });

    it('should invalidate similarity groups on goal name update', async () => {
      const goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });

      const group = await GoalSimilarityGroupModel.create({
        recipientId: recipient.id,
        userHasInvalidated: false,
        finalGoalId: null,
      });

      await GoalSimilarityGroupGoalModel.create({
        goalSimilarityGroupId: group.id,
        goalId: goal.id,
      });

      await goal.update({ name: 'New Name' }, { individualHooks: true });

      const result = await GoalSimilarityGroupModel.findAll({
        where: {
          recipientId: recipient.id,
          userHasInvalidated: false,
          finalGoalId: null,
        },
      });

      expect(result.length).toEqual(0);
    });

    it('should invalidate similarity groups on goal destroy', async () => {
      const goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });

      const group = await GoalSimilarityGroupModel.create({
        recipientId: recipient.id,
        userHasInvalidated: false,
        finalGoalId: null,
      });

      await GoalSimilarityGroupGoalModel.create({
        goalSimilarityGroupId: group.id,
        goalId: goal.id,
      });

      await GoalModel.destroy({
        where: {
          id: goal.id,
        },
        individualHooks: true,
      });

      const result = await GoalSimilarityGroupModel.findAll({
        where: {
          recipientId: recipient.id,
          userHasInvalidated: false,
          finalGoalId: null,
        },
      });

      expect(result.length).toEqual(0);
    });

    afterAll(async () => {
      const goals = await GoalModel.findAll({ where: { grantId: grant.id } });

      await GoalSimilarityGroupGoalModel.destroy({
        where: {
          goalId: goals.map((goal) => goal.id),
        },
      });

      await GoalModel.destroy({
        where: {
          grantId: grant.id,
        },
        force: true,
      });

      await GrantModel.destroy({
        where: {
          id: grant.id,
        },
      });

      await GoalSimilarityGroupModel.destroy({
        where: {
          recipientId: recipient.id,
        },
      });

      await RecipientModel.destroy({
        where: {
          id: recipient.id,
        },
      });
      await db.close();
    });
  });

  describe('processForEmbeddedResources', () => {
    const sequelize = {};
    const instance = {
      id: 1,
      changed: jest.fn(),
    };

    afterEach(() => jest.clearAllMocks());

    it('should call processGoalForResourcesById if auto detection is true', async () => {
      const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
      calculateIsAutoDetectedForGoal.mockReturnValueOnce(true);
      await processForEmbeddedResources(sequelize, instance);
      expect(processGoalForResourcesById).toHaveBeenCalledWith(instance.id);
    });

    it('should not call processGoalForResourcesById if auto detection is false', async () => {
      const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
      calculateIsAutoDetectedForGoal.mockReturnValueOnce(false);
      await processForEmbeddedResources(sequelize, instance);
      expect(processGoalForResourcesById).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateGoalTemplate', () => {
    it('should find or create a goal template', async () => {
      const sequelize = {
        models: {
          GoalTemplate: {
            findOrCreate: jest.fn().mockResolvedValue([{ id: 1 }, true]),
          },
        },
        fn: jest.fn(),
      };
      const transaction = {};
      const regionId = 1;
      const name = 'Test Template';
      const createdAt = new Date();

      const result = await findOrCreateGoalTemplate(
        sequelize,
        transaction,
        regionId,
        name,
        createdAt,
      );

      expect(sequelize.models.GoalTemplate.findOrCreate).toHaveBeenCalledWith({
        where: {
          hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', name), '')),
          regionId,
        },
        defaults: {
          templateName: name,
          lastUsed: createdAt,
          regionId,
          creationMethod: 'Automatic',
        },
        transaction,
      });
      expect(result).toEqual({ id: 1, name });
    });
  });
});
