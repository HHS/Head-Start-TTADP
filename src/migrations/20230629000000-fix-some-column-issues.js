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

      // Disable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction },
      );

      const tables = await queryInterface.sequelize.query(
        `
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name like 'ZAL%'
        AND column_name = 'dml_as'
        AND is_nullable = 'YES'
        ORDER BY table_name, ordinal_position;
        `,
        { raw: true, transaction },
      );

      await Promise.all(tables[0].map(({ table_name }) => queryInterface.sequelize.query(
        `
        UPDATE "${table_name}"
        SET dml_as = dml_by
        WHERE dml_as IS NULL;
        ALTER TABLE "${table_name}"
        ALTER COLUMN "dml_as" SET NOT NULL;
        `,
        {
          transaction,
          timeout: 300000,
          benchmark: true,
        },
      )));

      // Disable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction },
      );
    },
  ),
};
