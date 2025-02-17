const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Add monitor goal template.
      await queryInterface.sequelize.query(
        `-- change Programs startDate and endDate types to date
        ALTER TABLE "Programs" ALTER COLUMN "startDate" TYPE date
        USING (NULLIF("startDate", '')::date)
        ;
        ALTER TABLE "Programs" ALTER COLUMN "endDate" TYPE date
        USING (NULLIF("endDate", '')::date)
        ;
        `,
        { transaction },
      );
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(
        `-- change Programs startDate and endDate types back to varchar
        ALTER TABLE "Programs" ALTER COLUMN "startDate" TYPE VARCHAR(255)
        USING ("startDate"::varchar(255))
        ;
        ALTER TABLE "Programs" ALTER COLUMN "endDate" TYPE VARCHAR(255)
        USING ("endDate"::varchar(255))
        ;
        `,
        { transaction },
      );
    },
  ),
};
