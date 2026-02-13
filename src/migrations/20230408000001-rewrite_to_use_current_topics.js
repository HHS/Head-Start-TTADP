/* eslint-disable max-len */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )
      // Update all the existing link tables to use the current topics,
      // then update ActivityReports.topics
      await queryInterface.sequelize.query(
        `
        DROP TABLE IF EXISTS renamed_topics;
        CREATE TEMP TABLE renamed_topics AS
        SELECT DISTINCT
          lt.id legacy_tid,
          lt."mapsTo" current_tid,
          lt.name legacy_name,
          ct.name current_name
        FROM "Topics" lt
        JOIN "Topics" ct
          ON lt."mapsTo" = ct.id
        WHERE lt.name IN ('Teaching Practices / Teacher-Child Interactions', 'Child Assessment, Development, Screening')
        ;

        DROP TABLE IF EXISTS updated_legacy_ars;
        CREATE TEMP TABLE updated_legacy_ars AS
        WITH updater AS (
          UPDATE "ActivityReports"
          SET imported = JSONB_SET(
            imported,
            ARRAY['topics'],
            TO_JSONB(REPLACE(imported->>'topics', legacy_name, current_name))
            )
          FROM renamed_topics
          WHERE imported->>'topics' like '%' || legacy_name  || '%'
          RETURNING
            id updated_id,
            legacy_tid
        ) SELECT * FROM updater
        ;

        -- Because the updates only update on the first match but multiple changes may
        -- be needed for each line, the following logic must be executed once per
        -- topic replacement beyond the first.
        WITH additional_round AS (
        UPDATE "ActivityReports"
        SET imported = JSONB_SET(
          imported,
          ARRAY['topics'],
          TO_JSONB(REPLACE(imported->>'topics', legacy_name, current_name))
          )
        FROM renamed_topics
        WHERE imported->>'topics' like '%' || legacy_name  || '%'
        RETURNING
          id updated_id,
          legacy_tid
        )
        INSERT INTO updated_legacy_ars
        SELECT * FROM additional_round
        ;

        DROP TABLE IF EXISTS updated_activity_reports;
        CREATE TEMP TABLE updated_activity_reports AS
        WITH updater AS (
          WITH renames AS (
            SELECT DISTINCT
              legacy_name,
              current_name
            FROM renamed_topics
          )
          UPDATE "ActivityReports"
          SET topics = ARRAY_REPLACE(topics, legacy_name, current_name)
          FROM renames
          WHERE legacy_name = ANY(topics)
          RETURNING
            id updated_id,
            legacy_name
        ) SELECT * FROM updater
        ;

        /* We don't actually need to make any of these changes
        DROP TABLE IF EXISTS updated_objective_topics;
        CREATE TEMP TABLE updated_objective_topics AS
        WITH updater AS (
          UPDATE "ObjectiveTopics"
          SET "topicId" = current_tid
          FROM renamed_topics
          WHERE "topicId" = legacy_tid
          RETURNING
            id updated_id,
            legacy_tid
        ) SELECT * FROM updater
        ;

        DROP TABLE IF EXISTS updated_ar_objective_topics;
        CREATE TEMP TABLE updated_ar_objective_topics AS
        WITH updater AS (
          UPDATE "ActivityReportObjectiveTopics"
          SET "topicId" = current_tid
          FROM renamed_topics
          WHERE "topicId" = legacy_tid
          RETURNING
            id updated_id,
            legacy_tid
        ) SELECT * FROM updater
        ;

        DROP TABLE IF EXISTS updated_objective_template_topics;
        CREATE TEMP TABLE updated_objective_template_topics AS
        WITH updater AS (
          UPDATE "ObjectiveTemplateTopics"
          SET "topicId" = current_tid
          FROM renamed_topics
          WHERE "topicId" = legacy_tid
          RETURNING
            id updated_id,
            legacy_tid
        ) SELECT * FROM updater
        ;

        DROP TABLE IF EXISTS updated_role_topics;
        CREATE TEMP TABLE updated_role_topics AS
        WITH updater AS (
          UPDATE "RoleTopics"
          SET "topicId" = current_tid
          FROM renamed_topics
          WHERE "topicId" = legacy_tid
          RETURNING
            id updated_id,
            legacy_tid
        ) SELECT * FROM updater
        ;

        SELECT 'updated_objective_topics' tablename, COUNT(*) updates
        FROM updated_objective_topics
        UNION
        SELECT 'updated_ar_objective_topics', COUNT(*)
        FROM updated_ar_objective_topics
        UNION
        SELECT 'updated_objective_template_topics', COUNT(*)
        FROM updated_objective_template_topics
        UNION
        SELECT 'updated_role_topics', COUNT(*)
        FROM updated_role_topics
        UNION
        SELECT 'updated_activity_reports', COUNT(*)
        FROM updated_activity_reports
        UNION
        SELECT 'updated_legacy_ars', COUNT(*)
        FROM updated_activity_reports
        ;
        */
        `,
        { transaction }
      )
    })
  },
  down: async () => {},
}
