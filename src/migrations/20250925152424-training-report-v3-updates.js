const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      /** 1) Rename EventReportPilot to TrainingReport

      /** 2) Rename SessionReportPilot

      /** 3) Training report approver */
      // unlike the AR/CR, there can only be one approver,
      // so we just add an approverId column to EventReportPilots

      /** 4) Different types of session and event reports */
      // We need an enum that tracks the initial selection
      // this will make the templating easier as we build the
      // rest of the form

      /** 5) Training report collaborators */
      // remove from the BLOB

      /** 6) */
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
    });
  },
};
