const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.createTable('EventReportPilotNationalCenterUsers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        eventReportPilotId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'EventReportPilots',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        nationalCenterName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        nationalCenterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'NationalCenters',
            key: 'id',
          },
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        userName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
      })

      await queryInterface.sequelize.query(
        `
      ALTER TABLE "EventReportPilotNationalCenterUsers"
      ADD CONSTRAINT "EventReportPilotNationalCenterUsers_nationalCenterId_userId_eventReportPilotId_unique" UNIQUE ("nationalCenterId", "eventReportPilotId", "userId");
  `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await removeTables(queryInterface, transaction, ['EventReportPilotNationalCenterUsers'])
    })
  },
}
