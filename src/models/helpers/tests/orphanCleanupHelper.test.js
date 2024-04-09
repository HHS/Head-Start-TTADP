const { cleanupOrphanResources, cleanupOrphanFiles } = require('../orphanCleanupHelper');

describe('orphanCleanupHelper', () => {
  describe('cleanupOrphanFiles', () => {
    it('should delete orphan files', async () => {
      const sequelize = {
        models: {
          File: {
            destroy: jest.fn(),
          },
        },
        literal: jest.fn(),
      }; // Replace with your sequelize instance
      const fileId = 123; // Replace with the file ID you want to delete

      await cleanupOrphanFiles(sequelize, fileId);

      expect(sequelize.models.File.destroy).toHaveBeenCalledTimes(1);
      expect(sequelize.literal).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('cleanupOrphanResources', () => {
    it('should delete orphan resources', async () => {
      const sequelize = {
        models: {
          Resource: {
            destroy: jest.fn(),
          },
        },
        literal: jest.fn(),
      }; // Replace with your sequelize instance
      const resourceId = 123; // Replace with the resource ID you want to delete

      await cleanupOrphanResources(sequelize, resourceId);

      expect(sequelize.models.Resource.destroy).toHaveBeenCalledTimes(1);
      expect(sequelize.literal).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
