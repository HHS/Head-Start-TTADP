module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
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
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      try {
        await queryInterface.sequelize.query(
          `
          UPDATE "ActivityReports"
          SET "ttaType" =
            CASE "ttaType"
              WHEN '{"Technical Assistance"}' THEN ARRAY['technical-assistance']
              WHEN '{"Training"}' THEN ARRAY['training']
              WHEN '{"Both"}' THEN ARRAY['training','technical-assistance']
              WHEN '{}' THEN NULL
              ELSE "ttaType"
            END
          WHERE "ttaType" NOT IN ('{training}','{training,technical-assistance}','{technical-assistance}');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
};
