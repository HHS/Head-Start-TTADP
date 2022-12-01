/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    // insert a new row into the UserSettings table
    await queryInterface.sequelize.query(
      `
        INSERT INTO "UserSettings" ("class", "key", "default", "createdAt", "updatedAt")
        VALUES ('email', 'emailWhenGranteeReportApprovedProgramSpecialist', '"never"', current_timestamp, current_timestamp)
      `,
      { transaction },
    );
  }),
  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    // remove the above row
    await queryInterface.sequelize.query(
      `
        DELETE FROM "UserSettings" WHERE "class" = 'email' AND "key" = 'emailWhenGranteeReportApprovedProgramSpecialist'
      `,
      { transaction },
    );
  }),
};
