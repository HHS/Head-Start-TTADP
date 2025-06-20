module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
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
        `UPDATE "ActivityReports" SET "nonECLKCResourcesUsed" =
          (select array_remove("nonECLKCResourcesUsed", '{"value":""}'))
          where  '{"value":""}' = ANY ("nonECLKCResourcesUsed");`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE "ActivityReports" SET "ECLKCResourcesUsed" =
            (select array_remove("ECLKCResourcesUsed", '{"value":""}'))
            where  '{"value":""}' = ANY ("ECLKCResourcesUsed");`,
        { transaction },
      );
    },
  ),
  down: async () => { },
};
