import {
  calculateIsAutoDetectedForNextStep,
  processNextStepForResourcesById,
} from '../../services/resource';
import { afterCreate, afterUpdate } from './nextStep';

jest.mock('../../services/resource', () => ({
  calculateIsAutoDetectedForNextStep: jest.fn(),
  processNextStepForResourcesById: jest.fn(),
}));

describe('next step hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('afterCreate', () => {
    it('should call processNextStepForResourcesById', async () => {
      const sequelize = {};
      const instance = {
        id: 1,
        changed: jest.fn(),
      };
      const options = {};
      calculateIsAutoDetectedForNextStep.mockReturnValueOnce(true);
      await afterCreate(sequelize, instance, options);
      expect(processNextStepForResourcesById).toHaveBeenCalledWith(instance.id);
    });

    it('should not call processNextStepForResourcesById', async () => {
      const sequelize = {};
      const instance = {
        id: 1,
        changed: jest.fn(),
      };
      const options = {};
      await afterCreate(sequelize, instance, options);
      expect(processNextStepForResourcesById).not.toHaveBeenCalledWith(instance.id);
    });
  });

  describe('afterUpdate', () => {
    it('should call processNextStepForResourcesById', async () => {
      const sequelize = {};
      const instance = {
        id: 1,
        changed: jest.fn(),
      };
      const options = {};
      calculateIsAutoDetectedForNextStep.mockReturnValueOnce(true);
      await afterUpdate(sequelize, instance, options);
      expect(processNextStepForResourcesById).toHaveBeenCalledWith(instance.id);
    });

    it('should not call processNextStepForResourcesById', async () => {
      const sequelize = {};
      const instance = {
        id: 1,
        changed: jest.fn(),
      };
      const options = {};
      await afterUpdate(sequelize, instance, options);
      expect(processNextStepForResourcesById).not.toHaveBeenCalledWith(instance.id);
    });
  });
});
