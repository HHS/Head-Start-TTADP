module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      // turn off the audit log
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

      // add new flag
      return queryInterface.sequelize.query(`
        DO $$ BEGIN
          ALTER TYPE "enum_Users_flags" ADD VALUE 'anv_statistics';
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `, { transaction });
    },
  ),

  down: async () => {},
};
