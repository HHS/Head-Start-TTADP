module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "ActivityReports"
      SET "endDate" = "startDate"
      WHERE id IN (53547, 49309, 37648, 21726)
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "ActivityReports" SET "endDate" = '202517-03-06' WHERE id = 53547;
      UPDATE "ActivityReports" SET "endDate" = '20242-11-14' WHERE id = 49309;
      UPDATE "ActivityReports" SET "endDate" = '20236-11-28' WHERE id = 37648;
      UPDATE "ActivityReports" SET "endDate" = '20221-07-06' WHERE id = 21726;
    `);
  },
};
