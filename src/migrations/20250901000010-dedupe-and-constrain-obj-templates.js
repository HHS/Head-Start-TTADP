const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        -------------------------------------------------------------------
        -- 1 Find duplicate Objective templates and merge their properties
        -- 2 Create the map of dupes to targeted heirs so it can be used
        --   to update Objectives that are currently linked to the dupes
        -- 3 Update Objectives that are pointed at dupes
        -- 4 Remove the dupe templates
        -- 5 Update target templates with merged use and modification times
        -- 6 Add the constraint
        -------------------------------------------------------------------
        
        -- Find duplicate Objective templates and merge their properties
        DROP TABLE IF EXISTS objtemplate_dupes;
        CREATE TEMP TABLE objtemplate_dupes
        AS
        SELECT
          "regionId" region,
          "templateTitle" template_title,
          MIN(id) target_id,
          MAX("lastUsed") last_used,
          MAX("templateTitleModifiedAt") title_mod_at
        FROM "ObjectiveTemplates"
        GROUP BY 1,2
        HAVING COUNT(*) > 1
        ;

        -- Create the map of dupes to targeted heirs so it can be used
        -- to update Objectives that are currently linked to the dupes
        DROP TABLE IF EXISTS retarget_map;
        CREATE TEMP TABLE retarget_map
        AS
        SELECT
          id dupe_id,
          target_id
        FROM "ObjectiveTemplates"
        JOIN objtemplate_dupes
          ON "regionId" = region
          AND "templateTitle" = template_title
        WHERE id != target_id
        ;

        -- Update Objectives that are pointed at dupes
        DROP TABLE IF EXISTS obj_updates;
        CREATE TEMP TABLE obj_updates
        AS
        WITH updater AS (
        UPDATE "Objectives"
        SET
          "updatedAt" = NOW(),
          "objectiveTemplateId" = target_id
        FROM retarget_map
        WHERE "objectiveTemplateId" = dupe_id
        RETURNING *
        )
        SELECT * FROM updater
        ;

        -- Remove the dupe templates
        DROP TABLE IF EXISTS template_deletes;
        CREATE TEMP TABLE template_deletes
        AS
        WITH updater AS (
        DELETE FROM "ObjectiveTemplates"
        USING retarget_map
        WHERE id = dupe_id
        RETURNING *
        )
        SELECT * FROM updater
        ;
        
        -- Update target templates with merged use and modification times
        DROP TABLE IF EXISTS template_updates;
        CREATE TEMP TABLE template_updates
        AS
        WITH updater AS (
        UPDATE "ObjectiveTemplates"
        SET
          "updatedAt" = NOW(),
          "lastUsed" = last_used,
          "templateTitleModifiedAt" = title_mod_at
        FROM objtemplate_dupes
        WHERE "regionId" = region
          AND "templateTitle" = template_title
          AND ("lastUsed" != last_used OR "templateTitleModifiedAt" != title_mod_at)
        RETURNING *
        )
        SELECT * FROM updater
        ;

        -- Add the constraint
        ALTER TABLE "ObjectiveTemplates"
        ADD CONSTRAINT objective_templates_template_title_region_id_uniq UNIQUE
        ("templateTitle","regionId");

        -- convenience query for validation
        SELECT 1 ord, 'total dupes' item, (SELECT COUNT(*) FROM retarget_map) cnt
        UNION
        SELECT 2,'deleted dupes', (SELECT COUNT(*) FROM template_deletes)
        UNION
        SELECT 3,'total originals', (SELECT COUNT(DISTINCT target_id) FROM objtemplate_dupes)
        UNION
        SELECT 4,'updated originals', (SELECT COUNT(*) FROM template_updates)
        UNION
        SELECT 5,'retargeted Objectives', (SELECT COUNT(*) FROM obj_updates)
        ORDER BY 1;
    `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */`
        ALTER TABLE "ObjectiveTemplates"
        DROP CONSTRAINT objective_templates_template_title_region_id_uniq;
    `, { transaction });
    });
  },
};
