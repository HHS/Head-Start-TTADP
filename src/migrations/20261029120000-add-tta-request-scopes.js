const { prepMigration } = require('../lib/migration');

const TTA_REQUEST_SCOPE_IDS = [10, 11, 12, 13];
const PRIMARY_TTA_APPROVER_INDEX = 'unique_primary_tta_approver_per_region';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.bulkInsert(
        'Scopes',
        [
          {
            id: 10,
            name: 'READ_WRITE_TTA_REQUESTS',
            description: 'Can view and create/edit TTA requests in the region',
          },
          {
            id: 11,
            name: 'REVIEW_TTA_REQUESTS',
            description: 'Can review TTA requests in the region',
          },
          {
            id: 12,
            name: 'APPROVE_TTA_REQUESTS',
            description: 'Can approve TTA requests as the COR in the region',
          },
          {
            id: 13,
            name: 'BACKUP_APPROVE_TTA_REQUESTS',
            description: 'Can approve TTA requests as the backup COR in the region',
          },
        ],
        { ignoreDuplicates: true, transaction }
      );

      await queryInterface.addIndex('Permissions', ['regionId'], {
        name: PRIMARY_TTA_APPROVER_INDEX,
        unique: true,
        where: { scopeId: 12 },
        transaction,
      });
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.removeIndex('Permissions', PRIMARY_TTA_APPROVER_INDEX, { transaction });
      await queryInterface.bulkDelete(
        'Permissions',
        { scopeId: TTA_REQUEST_SCOPE_IDS },
        { transaction }
      );
      await queryInterface.bulkDelete('Scopes', { id: TTA_REQUEST_SCOPE_IDS }, { transaction });
    }),
};
