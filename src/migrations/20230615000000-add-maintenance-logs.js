const { prepMigration, removeTables } = require('../lib/migration')
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../constants')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.createTable(
        'MaintenanceLogs',
        {
          id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          category: {
            allowNull: false,
            type: Sequelize.DataTypes.ENUM(Object.values(MAINTENANCE_CATEGORY)),
          },
          type: {
            allowNull: false,
            type: Sequelize.DataTypes.ENUM(Object.values(MAINTENANCE_TYPE)),
          },
          data: {
            allowNull: false,
            type: Sequelize.JSON,
          },
          isSuccessful: {
            type: Sequelize.BOOLEAN,
          },
          triggeredById: {
            type: Sequelize.BIGINT,
            allowNull: true,
            references: {
              model: {
                tableName: 'MaintenanceLogs',
              },
              key: 'id',
            },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      )

      // Don't log any activity on "MaintenanceLogs" table
      await queryInterface.sequelize.query(
        `
      SELECT "ZAFRemoveAuditingOnTable"('MaintenanceLogs');
      `,
        { raw: true, transaction }
      )
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await removeTables(queryInterface, transaction, ['MaintenanceLogs'])

      await queryInterface.sequelize.query(
        `
      DELETE FROM "ZAFilter"
      WHERE "tableName" = 'MaintenanceLogs';
      `,
        { transaction }
      )
    })
  },
}
