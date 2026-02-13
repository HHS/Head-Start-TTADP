const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return removeTables(queryInterface, transaction, ['RttapaPilots'])
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.createTable(
        'RttapaPilots',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
          },
          recipientId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Recipients',
              },
              key: 'id',
            },
          },
          regionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Regions',
              },
              key: 'id',
            },
          },
          notes: {
            allowNull: true,
            type: Sequelize.TEXT,
          },
          goals: {
            allowNull: true,
            type: Sequelize.JSONB,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          reviewDate: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      )
    })
  },
}
