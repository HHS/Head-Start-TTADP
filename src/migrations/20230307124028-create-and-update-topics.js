/* eslint-disable max-len */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
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

      // Add new topic,
      await queryInterface.sequelize.query(
        `
            INSERT INTO "Topics"
            ("name", "createdAt", "updatedAt")
            VALUES
            ('Fatherhood / Male Caregiving', current_timestamp, current_timestamp);
          `,
        { transaction },
      );

      // Change existing topic.
      await queryInterface.sequelize.query(
        `UPDATE "Topics"
         SET
            "name" = 'Ongoing Monitoring and Continuous Improvement',
            "updatedAt" = current_timestamp
        WHERE "name" = 'Ongoing Monitoring Management System'; `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
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

      // Disable audit logging
      await queryInterface.sequelize.query(
        `
            SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
            `,
        { transaction },
      );

      // Revert topic to what it was before.
      await queryInterface.sequelize.query(
        `UPDATE "Topics"
         SET
            "name" = 'Ongoing Monitoring Management System',
            "updatedAt" = current_timestamp
        WHERE "name" = 'Ongoing Monitoring and Continuous Improvement'; `,
        { transaction },
      );

      // Delete added topic
      await queryInterface.sequelize.query(
        'DELETE FROM "Topics" WHERE "name" = \'Fatherhood / Male Caregiving\';',
        { transaction },
      );

      // Enable audit logging
      await queryInterface.sequelize.query(
        `
            SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
            `,
        { transaction },
      );
    });
  },
};
