/* eslint-disable max-len */
const goalText = '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)';

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

      // Add first curated template
      await queryInterface.sequelize.query(
        `INSERT INTO "GoalTemplates" (
          hash,
          "templateName",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateNameModifiedAt"
        ) Values (
          MD5(TRIM('${goalText}')),
          '${goalText}',
          null,
          'Curated'::"enum_GoalTemplates_creationMethod",
          current_timestamp,
          current_timestamp,
          NULL,
          current_timestamp
        );`,
        { transaction },
      );

      // Add new topics,
      await queryInterface.sequelize.query(
        `
            INSERT INTO "Topics"
            ("name", "createdAt", "updatedAt")
            VALUES
            ('FEI - Community Options', current_timestamp, current_timestamp),
            ('FEI - Community Partnerships', current_timestamp, current_timestamp),
            ('FEI - Facilities', current_timestamp, current_timestamp),
            ('FEI - Family Circumstances', current_timestamp, current_timestamp),
            ('FEI - Workforce', current_timestamp, current_timestamp);
          `,
        { transaction },
      );
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DELETE FROM "GoalTemplates"
        WHERE hash = MD5(TRIM('${goalText}'))
        AND "creationMethod" = 'Curated'::"enum_GoalTemplates_creationMethod";
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DELETE FROM "Topics"
        WHERE name IN (
          'FEI - Community Options',
          'FEI - Community Partnerships',
          'FEI - Facilities',
          'FEI - Family Circumstances',
          'FEI - Workforce',
        );
        `,
        { transaction },
      );
    });
  },
};
