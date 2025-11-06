/* eslint-disable global-require */
const { sequelize } = require('..');
const {
  processForEmbeddedResources,
  beforeCreate,
  beforeUpdate,
} = require('./goal');
const { GOAL_STATUS, OBJECTIVE_STATUS } = require('../../constants');

jest.mock('../../services/resource');

describe('goal hooks', () => {
  describe('beforeUpdate', () => {
    it('throws when editing a pre-standard goal', async () => {
      const instance = { id: 42, prestandard: true };
      await expect(beforeUpdate({}, instance, {})).rejects.toThrow(/pre-standard/);
    });

    it('allows editing when goal is not pre-standard', async () => {
      const instance = { id: 43, prestandard: false };
      await expect(beforeUpdate({}, instance, {})).resolves.not.toThrow();
    });
  });
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
      const sequelizeToPass = {
        fn: jest.fn(),
        models: {
          GoalTemplate: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      };
      await expect(beforeCreate(sequelizeToPass, instance)).resolves.not.toThrow();
      expect(instanceSet).not.toHaveBeenCalled();
    });
  });

  describe('processForEmbeddedResources', () => {
    const sequelizeToPass = {};
    const instance = {
      id: 1,
      changed: jest.fn(),
    };

    afterEach(() => jest.clearAllMocks());

    it('should call processGoalForResourcesById if auto detection is true', async () => {
      const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
      calculateIsAutoDetectedForGoal.mockReturnValueOnce(true);
      await processForEmbeddedResources(sequelizeToPass, instance);
      expect(processGoalForResourcesById).toHaveBeenCalledWith(instance.id);
    });

    it('should not call processGoalForResourcesById if auto detection is false', async () => {
      const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
      calculateIsAutoDetectedForGoal.mockReturnValueOnce(false);
      await processForEmbeddedResources(sequelize, instance);
      expect(processGoalForResourcesById).not.toHaveBeenCalled();
    });
  });
});
