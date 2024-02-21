const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
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
          onDelete: 'CASCADE',
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
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
      });

      await queryInterface.sequelize.query(`
            ALTER TABLE "EventReportPilotNationalCenterUsers"
            ADD CONSTRAINT "EventReportPilotNationalCenterUsers_nationalCenterId_userId_eventReportPilotId_unique" UNIQUE ("nationalCenterId", "eventReportPilotId", "userId");
        `, { transaction });
    });
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
};
