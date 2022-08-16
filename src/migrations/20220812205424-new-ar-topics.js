'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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

      // Create new topics:
      // - Child Screening and Assessment
      // - Teaching / Caregiving Practices
      // - Disabilities Services
      // - Ongoing Monitoring Management System
      // - Training and Professional Development
      await queryInterface.sequelize.query(
        `
          INSERT INTO "Topics"
          ("name", "createdAt", "updatedAt")
          VALUES
          ('Child Screening and Assessment', current_timestamp, current_timestamp),
          ('Teaching / Caregiving Practices', current_timestamp, current_timestamp),
          ('Disabilities Services', current_timestamp, current_timestamp),
          ('Ongoing Monitoring Management System', current_timestamp, current_timestamp),
          ('Training and Professional Development', current_timestamp, current_timestamp);
        `,
        { transaction },
      );

      // Update `mapsTo` field of existing topics to point to new topics
      await queryInterface.sequelize.query(
        'UPDATE "Topics" t1 SET "mapsTo" = t2.id, "deletedAt" = current_timestamp FROM "Topics" t2 WHERE t1.name = \'Teaching Practices / Teacher-Child Interactions\' AND t2.name = \'Teaching / Caregiving Practices\' AND t1."deletedAt" IS NULL;',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'UPDATE "Topics" t1 SET "mapsTo" = t2.id, "deletedAt" = current_timestamp FROM "Topics" t2 WHERE t1.name = \'Teaching Practices / Teacher-Child Interactions\' AND t2.name = \'Teaching / Caregiving Practices\' AND t1."deletedAt" IS NULL;',
        { transaction },
      );

      // Update `topics` column of existing ActivityReport records to use the new topics:
      await queryInterface.sequelize.query(
        'UPDATE "ActivityReports" SET topics = array_replace(topics, \'Child Assessment, Development, Screening\', \'Child Screening and Assessment\') WHERE topics @> \'{"Child Assessment, Development, Screening"}\';',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'UPDATE "ActivityReports" SET topics = array_replace(topics, \'Teaching Practices / Teacher-Child Interactions\', \'Teaching / Caregiving Practices\') WHERE topics @> \'{"Teaching Practices / Teacher-Child Interactions"}\';',
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

  async down(queryInterface, Sequelize) {
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
