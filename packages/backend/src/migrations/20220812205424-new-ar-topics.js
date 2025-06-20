/* eslint-disable max-len */

// An array of objects with the old and new topic names.
const topicMapping = [
  { oldName: 'Child Assessment, Development, Screening', newName: 'Child Screening and Assessment' },
  { oldName: 'Teaching Practices / Teacher-Child Interactions', newName: 'Teaching / Caregiving Practices' },
];

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
      await Promise.all(topicMapping.map(({ oldName, newName }) => queryInterface.sequelize.query(
        `UPDATE "Topics" t1 
        SET 
            "mapsTo" = t2.id, 
            "deletedAt" = current_timestamp 
        FROM "Topics" t2 
        WHERE t1.name = '${oldName}' 
        AND t2.name = '${newName}' 
        AND t1."deletedAt" IS NULL;`,
        { transaction },
      )));

      // Update `mapsTo` in topics for all topics that share the same old name - does NOT update deletedAt (would violate constraint [name-deletedAt-mapsTo])
      await Promise.all(topicMapping.map(({ oldName, newName }) => queryInterface.sequelize.query(
        `UPDATE "Topics" t1 
        SET 
            "mapsTo" = t2.id 
        FROM "Topics" t2 
        WHERE t1.name = '${oldName}' 
        AND t2.name = '${newName}' 
        AND t2."deletedAt" IS NULL;`,
        { transaction },
      )));

      // --------------------------------------------
      // Update `topics` column of existing ActivityReport records to use the new topics:
      await Promise.all(topicMapping.map(({ oldName, newName }) => queryInterface.sequelize.query(
        `UPDATE "ActivityReports" 
        SET 
            topics = array_replace(topics, '${oldName}', '${newName}') 
        WHERE topics @> '{"${oldName}"}';`,
        { transaction },
      )));
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
        `DELETE FROM "Topics" 
        WHERE name IN (
            'Child Screening and Assessment',
            'Teaching / Caregiving Practices',
            'Disabilities Services',
            'Ongoing Monitoring Management System',
            'Training and Professional Development'
        ) 
        AND "deletedAt" IS NULL;`,
        { transaction },
      );

      // Revert the values in the topics array column of ActivityReports to their previous values.
      await Promise.all(topicMapping.map(({ oldName, newName }) => queryInterface.sequelize.query(
        `UPDATE "ActivityReports"
        SET 
            topics = array_replace(topics, '${newName}', '${oldName}') 
        WHERE topics @> '{"${newName}"}';`,
        { transaction },
      )));

      // "Un-delete" the recently deleted topics.
      await Promise.all(topicMapping.map(({ oldName }) => queryInterface.sequelize.query(
        `UPDATE "Topics" 
        SET 
            "mapsTo" = null,
            "deletedAt" = null 
        WHERE name = '${oldName}' 
        AND "deletedAt" = (
            SELECT max("deletedAt") 
            FROM "Topics" 
            WHERE name = '${oldName}');`,
        { transaction },
      )));

      // Now, any deleted topics that share this name should map to this undeleted topic
      await Promise.all(topicMapping.map(({ oldName }) => queryInterface.sequelize.query(
        `UPDATE "Topics" t1 
        SET 
            "mapsTo" = t2.id 
        FROM "Topics" t2 
        WHERE t1.name = '${oldName}' 
        AND t1."deletedAt" IS NOT NULL 
        AND t2.name = '${oldName}' 
        AND t2."deletedAt" is NULL;`,
        { transaction },
      )));

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
