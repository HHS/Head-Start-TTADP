const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await prepMigration(queryInterface, transaction, __filename);

    await queryInterface.sequelize.query(
      `
        UPDATE "Users"
          SET "flags" = array_remove("flags", 'training_reports')
        WHERE 'training_reports' = ANY("flags");
       `,
      { transaction },
    );
  }),

  down: (queryInterface) => queryInterface.sequelize.transaction(async () => {
    // can't be rolled back
  }),
};
