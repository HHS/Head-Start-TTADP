const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.createTable(
        'SessionReportPilotSupportingAttachments',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          sessionReportPilotId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
              model: {
                tableName: 'SessionReportPilots',
              },
              key: 'id',
            },
          },
          fileId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
              model: {
                tableName: 'Files',
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
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.dropTable('SessionReportPilotSupportingAttachments', { transaction })
    }),
}
