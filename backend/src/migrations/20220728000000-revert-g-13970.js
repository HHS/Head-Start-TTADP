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
        `UPDATE "Goals"
         SET
           status = 'In Progress',
           "closeSuspendReason" = NULL,
           "closeSuspendContext" = NULL
         WHERE id IN (13970, 33134, 33132, 33133, 33131, 32561, 32562, 32563, 32560, 27334, 34063, 31864);`,
        { transaction },
      );
    },
  ),
  down: async () => { },
};
