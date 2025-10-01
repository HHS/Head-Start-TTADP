const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */

module.exports = {

  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;

      await prepMigration(queryInterface, transaction, sessionSig);

      /** 1) Training report approver */
      // unlike the AR/CR, there can only be one approver,
      // so we can satisfy this by adding an approverId column to EventReportPilots

      /** 2) Different types of session and event reports */
      // We need an enum that tracks the initial selection
      // this will make the templating easier as we build the
      // rest of the form
      // enum options = ['national_center', 'regional_tta_staff']
      // name: facilitation
      // type: enum[] (select one or both)
      // allow null: true

      /** 3) Training report collaborators */

      // new table remove from the data (JSONB) column

      /** 4) Training report trainer */
      // new table, links TR has one or many Trainers,
      // each trainer links to a User

      /** 5) Session recipients */
      // new table remove from the data (JSONB) column
      // A session has one or many recipients
      // each sessionRecipient links to a grant

      /** 6) Training report goal templates */
      // link a training report to a goaltemplate
      // a training report can have one or more goal templates
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;

      await prepMigration(queryInterface, transaction, sessionSig);
    });
  },

};
