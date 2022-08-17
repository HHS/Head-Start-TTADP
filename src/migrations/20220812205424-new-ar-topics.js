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

      // --------------------------------------------
      // Update `mapsTo` field of existing topics to point to new topics
      await queryInterface.sequelize.query(
        `UPDATE "Topics" t1 
        SET 
            "mapsTo" = t2.id, 
            "deletedAt" = current_timestamp 
        FROM "Topics" t2 
        WHERE t1.name = 'Child Assessment, Development, Screening' 
        AND t2.name = 'Child Screening and Assessment' 
        AND t1."deletedAt" IS NULL;`,
        { transaction },
      );

      // Update `mapsTo` in topics for all topics that share the same old name - does NOT update deletedAt (would violate constraint [name-deletedAt-mapsTo])
      await queryInterface.sequelize.query(
        `UPDATE "Topics" t1 
        SET 
            "mapsTo" = t2.id 
        FROM "Topics" t2 
        WHERE t1.name = 'Child Assessment, Development, Screening' 
        AND t2.name = 'Child Screening and Assessment' 
        AND t2."deletedAt" IS NULL;`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        'UPDATE "Topics" t1 SET "mapsTo" = t2.id, "deletedAt" = current_timestamp FROM "Topics" t2 WHERE t1.name = \'Teaching Practices / Teacher-Child Interactions\' AND t2.name = \'Teaching / Caregiving Practices\' AND t1."deletedAt" IS NULL;',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'UPDATE "Topics" t1 SET "mapsTo" = t2.id FROM "Topics" t2 WHERE t1.name = \'Teaching Practices / Teacher-Child Interactions\' AND t2.name = \'Teaching / Caregiving Practices\' AND t2."deletedAt" IS NULL;',
        { transaction },
      );

      // --------------------------------------------
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

      // Delete all the new topics
      await queryInterface.sequelize.query(
        'DELETE FROM "Topics" WHERE name IN (\'Child Screening and Assessment\', \'Teaching / Caregiving Practices\', \'Disabilities Services\', \'Ongoing Monitoring Management System\', \'Training and Professional Development\') AND "deletedAt" IS NULL;',
        { transaction },
      );

      // Revert the values in the topics array column of ActivityReports to their previous values.
      await queryInterface.sequelize.query(
        'UPDATE "ActivityReports" SET topics = array_replace(topics, \'Child Screening and Assessment\', \'Child Assessment, Development, Screening\') WHERE topics @> \'{"Child Screening and Assessment"}\';',
        { transaction },
      );

      await queryInterface.sequelize.query(
        'UPDATE "ActivityReports" SET topics = array_replace(topics, \'Teaching / Caregiving Practices\', \'Teaching Practices / Teacher-Child Interactions\') WHERE topics @> \'{"Teaching / Caregiving Practices"}\';',
        { transaction },
      );

      // "Un-delete" the recently deleted topics.
      await queryInterface.sequelize.query(
        'UPDATE "Topics" SET "mapsTo" = null, "deletedAt" = null WHERE name = \'Child Assessment, Development, Screening\' AND "deletedAt" = (SELECT max("deletedAt") FROM "Topics" WHERE name = \'Child Assessment, Development, Screening\');',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'UPDATE "Topics" SET "mapsTo" = null, "deletedAt" = null WHERE name = \'Teaching Practices / Teacher-Child Interactions\' AND "deletedAt" = (SELECT max("deletedAt") FROM "Topics" WHERE name = \'Teaching Practices / Teacher-Child Interactions\');',
        { transaction },
      );

      // Now, any deleted topics that share this name should map to this undeleted topic
      await queryInterface.sequelize.query(
        'UPDATE "Topics" t1 SET "mapsTo" = t2.id FROM "Topics" t2 WHERE t1.name = \'Child Assessment, Development, Screening\' AND t1."deletedAt" IS NOT NULL AND t2.name = \'Child Assessment, Development, Screening\' AND t2."deletedAt" is NULL;',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'UPDATE "Topics" t1 SET "mapsTo" = t2.id FROM "Topics" t2 WHERE t1.name = \'Teaching Practices / Teacher-Child Interactions\' AND t1."deletedAt" IS NOT NULL AND t2.name = \'Teaching Practices / Teacher-Child Interactions\' AND t2."deletedAt" is NULL;',
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
