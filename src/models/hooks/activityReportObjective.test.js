import { beforeDestroy } from './activityReportObjective';

describe('activityReportObjective hooks', () => {
  describe('beforeDestroy', () => {
    it('should propagate destroy to metadata', async () => {
      const mockAROFileDestroy = jest.fn();
      const mockAROResourceDestroy = jest.fn();
      const mockAROTopicDestroy = jest.fn();

      const mockSequelize = {
        models: {
          ActivityReportObjectiveFile: {
            destroy: mockAROFileDestroy,
          },
          ActivityReportObjectiveResource: {
            destroy: mockAROResourceDestroy,
          },
          ActivityReportObjectiveTopic: {
            destroy: mockAROTopicDestroy,
          },
        },
      };

      const mockInstance = {
        id: 1,
      };

      const mockOptions = {
        transaction: {},
      };

      await beforeDestroy(mockSequelize, mockInstance, mockOptions);

      expect(mockAROFileDestroy).toHaveBeenCalledWith({
        where: {
          activityReportObjectiveId: mockInstance.id,
        },
        individualHooks: true,
        transaction: mockOptions.transaction,
      });

      expect(mockAROResourceDestroy).toHaveBeenCalledWith({
        where: {
          activityReportObjectiveId: mockInstance.id,
        },
        individualHooks: true,
        transaction: mockOptions.transaction,
      });

      expect(mockAROTopicDestroy).toHaveBeenCalledWith({
        where: {
          activityReportObjectiveId: mockInstance.id,
        },
        individualHooks: true,
        transaction: mockOptions.transaction,
      });
    });
  });
});
