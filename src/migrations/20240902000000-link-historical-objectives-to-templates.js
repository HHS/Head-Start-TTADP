const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(/* sql */`
        -- This finds all objectives that have titles long enough to be meaningful but
        -- are not linked to a matching template and marks whether they're created on an
        -- RTR and what the most advanced status of a connected AR is. Then every
        -- Objective that is on at least one AR that has reached 'submitted' status
        -- is:
        --   - Converted to a template and inserted if there is no matching template
        --   - Updated to point to the new or existing template
        -- A query at the end shows the movement. Note that some "unmatched" numbers will
        -- grow slightly because the template to which they *would* match has been interted
        -- but the objective wasn't associated with any ARs with sufficiently advanced status

        DROP TABLE IF EXISTS unconnected_objectives;
        CREATE TEMP TABLE unconnected_objectives
        AS
        WITH stat_progression AS (
        SELECT
          1 statord,
          'deleted'::"enum_ActivityReports_calculatedStatus" statname
        UNION SELECT 2, NULL
        UNION SELECT 3,'draft'
        UNION SELECT 4,'submitted'
        UNION SELECT 5,'needs_action'
        UNION SELECT 6,'approved'
        ),
        titlematch AS (
        SELECT
          o.id oid,
          ot.id otid,
          COALESCE(gr."regionId",u."homeRegionId") region,
          o."createdVia" = 'rtr' is_rtr,
          MAX(statord) most_advanced_ar,
          MAX(aro."createdAt") last_used
        FROM "Objectives" o
        LEFT JOIN "Goals" g
          ON o."goalId" = g.id
        LEFT JOIN "Grants" gr
          ON g."grantId" = gr.id
        LEFT JOIN "ZALObjectives" zo
          ON o."goalId" IS NULL
          AND o.id = zo.data_id
          AND zo.dml_type = 'INSERT'
        LEFT JOIN "Users" u
          ON zo.dml_as = u.id
        LEFT JOIN "ObjectiveTemplates" ot
          ON TRIM(o.title) = TRIM(ot."templateTitle")
          AND gr."regionId" = ot."regionId"
        LEFT JOIN "ActivityReportObjectives" aro
          ON o.id = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
        JOIN stat_progression
          ON (ar."calculatedStatus" IS NULL AND statname IS NULL)
          OR ar."calculatedStatus" = statname
        WHERE o."objectiveTemplateId" IS NULL
          AND LENGTH(o.title) > 9
        GROUP BY 1,2,3,4
        )
        SELECT
          oid,
          otid,
          otid IS NULL template_missing,
          region,
          is_rtr,
          most_advanced_ar,
          statname,
          last_used
        FROM titlematch
        JOIN stat_progression
          ON most_advanced_ar = statord
        ;

        DROP TABLE IF EXISTS created_templates;
        CREATE TEMP TABLE created_templates
        AS
        WITH updater AS (
        INSERT INTO "ObjectiveTemplates" (
          hash,
          "templateTitle",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateTitleModifiedAt"
        )
        SELECT
          MD5(o.title),
          o.title,
          uo.region,
          'Automatic'::"enum_ObjectiveTemplates_creationMethod",
          NOW(),
          NOW(),
          MAX(uo.last_used),
          NOW()
        FROM unconnected_objectives uo
        JOIN "Objectives" o
          ON o.id = uo.oid
        WHERE uo.otid IS NULL
          AND uo.most_advanced_ar > 3
        GROUP BY 1,2,3,4,5,6,8
        RETURNING
          id new_otid,
          "templateTitle" new_template_title
        )
        SELECT * FROM UPDATER
        ;

        UPDATE unconnected_objectives
        SET otid = new_otid
        FROM "Objectives"
        JOIN created_templates
          ON new_template_title = title
        WHERE oid = id
        ;


        DROP TABLE IF EXISTS updated_objectives;
        CREATE TEMP TABLE updated_objectives
        AS
        WITH updater AS (
        UPDATE "Objectives" o
        SET "objectiveTemplateId" = otid
        FROM unconnected_objectives
        WHERE o.id = oid
          AND most_advanced_ar > 3
          AND "objectiveTemplateId" IS NULL
        RETURNING oid
        )
        SELECT * FROM UPDATER
        ;

        DROP TABLE IF EXISTS unconnected_objectives_after;
        CREATE TEMP TABLE unconnected_objectives_after
        AS
        WITH stat_progression AS (
        SELECT
          1 statord,
          'deleted'::"enum_ActivityReports_calculatedStatus" statname
        UNION SELECT 2, NULL
        UNION SELECT 3,'draft'
        UNION SELECT 4,'submitted'
        UNION SELECT 5,'needs_action'
        UNION SELECT 6,'approved'
        ),
        titlematch AS (
        SELECT
          o.id oid,
          ot.id otid,
          COALESCE(gr."regionId",u."homeRegionId") region,
          o."createdVia" = 'rtr' is_rtr,
          MAX(statord) most_advanced_ar,
          MAX(aro."createdAt") last_used
        FROM "Objectives" o
        LEFT JOIN "Goals" g
          ON o."goalId" = g.id
        LEFT JOIN "Grants" gr
          ON g."grantId" = gr.id
        LEFT JOIN "ZALObjectives" zo
          ON o."goalId" IS NULL
          AND o.id = zo.data_id
          AND zo.dml_type = 'INSERT'
        LEFT JOIN "Users" u
          ON zo.dml_as = u.id
        LEFT JOIN "ObjectiveTemplates" ot
          ON TRIM(o.title) = TRIM(ot."templateTitle")
          AND gr."regionId" = ot."regionId"
        LEFT JOIN "ActivityReportObjectives" aro
          ON o.id = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
        JOIN stat_progression
          ON (ar."calculatedStatus" IS NULL AND statname IS NULL)
          OR ar."calculatedStatus" = statname
        WHERE o."objectiveTemplateId" IS NULL
          AND LENGTH(o.title) > 9
        GROUP BY 1,2,3,4
        )
        SELECT
          oid,
          otid,
          otid IS NULL template_missing,
          region,
          is_rtr,
          most_advanced_ar,
          statname,
          last_used
        FROM titlematch
        JOIN stat_progression
          ON most_advanced_ar = statord
        ;

        WITH befores AS (
        SELECT
          is_rtr,
          statname,
          COUNT(*) FILTER (WHERE template_missing) no_templ,
          COUNT(*) cnt,
          'before' beforeafter
        FROM unconnected_objectives
        GROUP BY 1,2,5
        ),
        afters AS (
        SELECT
          is_rtr,
          statname,
          COUNT(*) FILTER (WHERE otid IS NULL) no_templ,
          COUNT(*) cnt,
          'after' beforeafter
        FROM unconnected_objectives_after
        GROUP BY 1,2,5
        )
        SELECT
          b.is_rtr,
          b.statname most_advanced_ar_status,
          b.no_templ no_templ_before,
          COALESCE(a.no_templ,0) no_templ_after,
          b.cnt "before",
          COALESCE(a.cnt,0) "after"
        FROM befores b
        LEFT JOIN afters a
          ON (
              (b.statname IS NULL AND a.statname IS NULL)
              OR b.statname = a.statname
            )
          AND (
              (b.is_rtr IS NULL AND a.is_rtr IS NULL)
              OR b.is_rtr = a.is_rtr
            )
        ORDER BY 2,1
        ;

        
        DROP TABLE IF EXISTS unconnected_objectives;
        DROP TABLE IF EXISTS updated_objectives;
        DROP TABLE IF EXISTS unconnected_objectives_after;

      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
