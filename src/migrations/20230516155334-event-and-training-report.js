/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const loggedUser = '0';
      const sessionSig = __filename;
      const auditDescriptor = 'RUN MIGRATIONS';
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS Events (
          id SERIAL PRIMARY KEY,
          ownerId INTEGER NOT NULL,
          pocId INTEGER NOT NULL,
          collaboratorIds INTEGER[] NOT NULL,
          regionId INTEGER NOT NULL,
          data JSONB NOT NULL
        );
        `
      );

      await queryInterface.sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS TrainingReports (
          id SERIAL PRIMARY KEY,
          eventId INTEGER NOT NULL,
          data JSONB NOT NULL,
          FOREIGN KEY (eventId) REFERENCES Events (id)
        );
        `
      );
    }),

  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS Events;`);
    }),
};
