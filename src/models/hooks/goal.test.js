/* eslint-disable global-require */
const {
  processForEmbeddedResources,
  findOrCreateGoalTemplate,
  preventCloseIfObjectivesOpen,
  beforeCreate,
} = require('./goal');
const { GOAL_STATUS, OBJECTIVE_STATUS } = require('../../constants');

jest.mock('../../services/resource');

describe('goal hooks', () => {
  describe('beforeCreate', () => {
    it('does nothing if instance already has goalTemplateId', async () => {
      const instanceSet = jest.fn();
      const instance = {
        goalTemplateId: 1,
        set: instanceSet,
      };
      await expect(beforeCreate({}, instance)).resolves.not.toThrow();
      expect(instanceSet).not.toHaveBeenCalled();
    });

    it('does nothing if sequelize cannot find a curated template', async () => {
      const instanceSet = jest.fn();
      const instance = {
        goalTemplateId: null,
        set: instanceSet,
      };
      const sequelize = {
        fn: jest.fn(),
        models: {
          GoalTemplate: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      };
      await expect(beforeCreate(sequelize, instance)).resolves.not.toThrow();
      expect(instanceSet).not.toHaveBeenCalled();
    });

    it('sets goalTemplateId if a curated template is found', async () => {
      const instanceSet = jest.fn();
      const instance = {
        goalTemplateId: null,
        set: instanceSet,
      };
      const sequelize = {
        fn: jest.fn(),
        models: {
          GoalTemplate: {
            findOne: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
      };
      await expect(beforeCreate(sequelize, instance)).resolves.not.toThrow();
      expect(instanceSet).toHaveBeenCalledWith('goalTemplateId', 1);
    });
  });

  describe('preventCloseIfObjectivesOpen', () => {
    it('does nothing if instance.changed is not an array', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue({}),
      };
      await expect(preventCloseIfObjectivesOpen({}, instance)).resolves.not.toThrow();
    });

    it('does nothing is instance.changed does not include status', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue(false),
      };
      await expect(preventCloseIfObjectivesOpen({}, instance)).resolves.not.toThrow();
    });
    it('does nothing if status is not CLOSED', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue(true),
        status: GOAL_STATUS.IN_PROGRESS,
      };
      await expect(preventCloseIfObjectivesOpen({}, instance)).resolves.not.toThrow();
    });

    it('throws an error if status is CLOSED and objectives are not closed', async () => {
      const instance = {
        changed: jest.fn().mockReturnValue(['status']),
        status: GOAL_STATUS.CLOSED,
      };
      const sequelize = {
        models: {
          Objective: {
            findAll: jest.fn().mockResolvedValue([
              { status: OBJECTIVE_STATUS.IN_PROGRESS },
            ]),
          },
        },
      };
      await expect(preventCloseIfObjectivesOpen(sequelize, instance)).rejects.toThrow();
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
