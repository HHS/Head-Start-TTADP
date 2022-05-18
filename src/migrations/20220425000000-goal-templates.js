module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
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
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // A new table to allow linking directly between Activity Reports and Goals
      await queryInterface.createTable('ActivityReportGoals', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        activityReportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
        },
        goalId: {
          allowNull: false,
          type: Sequelize.INTEGER,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // a new table to archive any goals that are not linked to a grant is some manner
      await queryInterface.createTable('DisconnectedGoals', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        name: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        status: {
          type: Sequelize.STRING,
        },
        timeframe: {
          type: Sequelize.STRING,
        },
        isFromSmartsheetTtaPlan: {
          type: Sequelize.BOOLEAN,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        closeSuspendReason: {
          allowNull: true,
          type: Sequelize.ENUM([
            'Duplicate goal',
            'Recipient request',
            'TTA complete',
            'Key staff turnover / vacancies',
            'Recipient is not responding',
            'Regional Office request',
          ]),
        },
        closeSuspendContext: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        endDate: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        previousStatus: {
          type: Sequelize.STRING,
        },
      }, { transaction });

      // Add GoalTemplates table
      await queryInterface.createTable('GoalTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        hash: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        templateName: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        regionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        creationMethod: {
          allowNull: false,
          type: Sequelize.ENUM(
            'Automatic',
            'Curated',
          ),
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        lastUsed: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        templateNameModifiedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        // To support up/down on the migration
        sourceGoals: {
          allowNull: false,
          type: Sequelize.ARRAY(Sequelize.INTEGER),
        },
      }, { transaction });

      // Add ObjectiveTemplates table
      await queryInterface.createTable('ObjectiveTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        hash: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        templateTitle: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        regionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        creationMethod: {
          allowNull: false,
          type: Sequelize.ENUM(
            'Automatic',
            'Curated',
          ),
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        lastUsed: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        templateTitleModifiedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        // To support up/down on the migration
        sourceObjectives: {
          allowNull: false,
          type: Sequelize.ARRAY(Sequelize.INTEGER),
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        userProvidedUrl: {
          type: Sequelize.STRING,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        objectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        topicId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Topics',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // Add GoalTemplateObjectiveTemplates table
      await queryInterface.createTable('GoalTemplateObjectiveTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        goalTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'GoalTemplates',
            },
            key: 'id',
          },
        },
        objectiveTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveRoles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Roles',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateRoles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Roles',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // Disable logging while doing mass updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------

      // Clean up Roles table and add isSpecialist, deletedAt, & mapsTo columns
      try {
        await queryInterface.addColumn('Roles', 'isSpecialist', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          default: false,
          onUpdate: 'CASCADE',
        }, { transaction });

        await queryInterface.addColumn('Roles', 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Roles', 'mapsTo', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });

        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempRoles" AS
            SELECT
              MIN(r."id") "id",
              r.name,
              r."fullName",
              MIN(r."createdAt") "createdAt",
              MAX(r."updatedAt") "updatedAt",
              MAX(r."updatedAt") "deletedAt",
              r."isSpecialist",
              r."mapsTo"
            FROM "Roles" r
            GROUP BY  r.name, r."fullName", r."isSpecialist", r."mapsTo"
            ORDER BY  r.name, r."fullName", r."isSpecialist", r."mapsTo";
            ------------------------------------------------------------------------------------
            TRUNCATE TABLE
              "Roles",
              "RoleTopics",
              "ObjectiveRoles",
              "ObjectiveTemplateRoles"
            RESTART IDENTITY;
            ------------------------------------------------------------------------------------
            INSERT INTO "Roles" (
              "id",
              "name",
              "fullName",
              "createdAt",
              "updatedAt",
              "deletedAt",
              "isSpecialist",
              "mapsTo"
            )
            SELECT
              "id",
              "name",
              "fullName",
              "createdAt",
              "updatedAt",
              "deletedAt",
              "isSpecialist",
              "mapsTo"
            FROM "TempRoles";
            ------------------------------------------------------------------------------------
            UPDATE ONLY "Roles"
            SET "isSpecialist" = true
            WHERE "fullName" in (
              'Family Engagement Specialist',
              'Health Specialist',
              'Early Childhood Specialist',
              'System Specialist',
              'Grantee Specialist'
            );
            ------------------------------------------------------------------------------------
            UPDATE ONLY "Roles" r1
            SET
              "deletedAt" = NOW(),
              "mapsTo" = r2.id
            FROM "Roles" r2
            WHERE r1."fullName" = 'Grants Specialist'
            AND r2."fullName" = 'Grantee Specialist';
            ------------------------------------------------------------------------------------
            DROP TABLE "TempRoles";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // Add the foreign key relation from Goals table to GoalTemplates for recording the parent
      // template leave goalTemplateId nullable for now until it can be populated with the IDs of
      // the parent templates
      try {
        await queryInterface.addColumn('Goals', 'goalTemplateId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GoalTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
        }, { transaction });

        await queryInterface.addColumn('Goals', 'grantId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Grants',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
        }, { transaction });

        await queryInterface.addColumn('Goals', 'onApprovedAR', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          default: false,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'precededBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'supersededBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Add the foreign key relation from Objectives table to ObjectiveTemplates for recording the
      // parent template leave goalTemplateId nullable for now until it can be populated with the
      // IDs of the parent templates
      try {
        await queryInterface.addColumn('Objectives', 'objectiveTemplateId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'otherEntityId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'OtherEntities',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'onApprovedAR', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          default: false,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportObjectives', 'ttaProvided', {
          type: Sequelize.TEXT,
          allowNull: true,
        }, { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------

      // Move Topics from goals to current objectives
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "ObjectiveTopics" ("objectiveId", "topicId", "createdAt", "updatedAt")
          SELECT DISTINCT
            o.id "objectiveId",
            tg."topicId",
            tg."createdAt",
            tg."updatedAt"
          FROM "Objectives" o
          JOIN "TopicGoals" tg
          on o."goalId" = tg."goalId"
          LEFT JOIN "ObjectiveTopics" ot
          ON o.id = ot."objectiveId"
          WHERE ot.id is null;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Drop TopicGoals table
      try {
        await queryInterface.dropTable('TopicGoals', { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // -------------------------------------------------------------------------------------------
      // Data Migration:
      //  1. create a unified temptable to match all goals to grants: __all_distinct_grants
      //  2. Populate GoalTemplates
      //  3. Populate DisconnectedGoals with the goals that do not link to any grants
      //  4. Populate ObjectiveTemplates
      //  5. Populate ObjectiveTemplateTopics
      //  6. Populate ObjectiveTemplateResources
      //  7. Populate discrete temp goals per grant, deduplicated and split into progressions
      //  8. Populate discrete temp objectives per goal per grant or other entity, deduplicated and
      //    split into progressions
      //  9. Populate temp objectives topics
      // 10. Populate temp objectives resources
      // 11. Populate temp activity report objectivess
      // 12. Truncate all tables that directly reference goals and objectives
      // 13. Repopulate Goals from temp table
      // 14. Repopulate Objectives from temp table
      // 15. Repopulate ObjectiveTopics from temp table
      // 16. Repopulate ObjectiveResources from temp table
      // 17. Repopulate ActivityReportObjectives from temp table
      // 18. Drop all temp tables used
      // 19. Drop sourceGoals column from GoalTemplates
      // 20. Drop sourceObjectives column from ObjectiveTemplates
      // 21. Populate GoalTemplateObjectiveTemplates
      // 22. Populate goal status for all goals based on rules defined on TTAHub-813
      //     1. If the goal is associated with a recipient that only has inactive grants
      //        > all goals = closed
      //     2. If the goal is associated with an AR for training, and the objective status is
      //        Completed
      //        > goal status = closed
      //     3. If the goal is associated with an AR and objective is In progress or Completed
      //        > goals status = in progress
      //     4. If the goal is associated with an AR and only associated with Not started
      //        objective(s)
      //        > goals status = not started
      //     5. If the goal doesn't have a status and no associated ARs and imported from RTTAPA
      //        less than or equal to 1yr ago
      //        > goal status = not started
      //     6. If the goal doesn't have a status and no associated ARs and imported over 1 yr ago
      //        > goal status = closed
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            -- 1. create a unified temptable to match all goals to grants: __all_distinct_grants
            CREATE TEMP TABLE "__all_distinct_grants" AS
            WITH
              all_grants as (
                SELECT
                  "gr"."id" "grantId",
                  gr.status,
                  gr."regionId",
                  g.id "goalId"
                FROM "Goals" g
                JOIN "Objectives" o
                ON g.id = o."goalId"
                JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                JOIN "ActivityRecipients" arp
                ON aro."activityReportId" = arp."activityReportId"
                JOIN "Grants" gr
                ON arp."grantId" = gr.id
                UNION
                SELECT
                  "gr"."id" "grantId",
                  gr.status,
                  gr."regionId",
                  g.id "goalId"
                FROM "Goals" g
                JOIN "GrantGoals" gg
                ON g.id = gg."goalId"
                JOIN "Grants" gr
                ON gg."grantId" = gr.id
              )
              SELECT DISTINCT *
              FROM all_grants;
            ------------------------------------------------------------------------------------
            -- 2. Populate GoalTemplates
            INSERT INTO "GoalTemplates" (
              "hash",
              "templateName",
              "regionId",
              "creationMethod",
              "createdAt",
              "updatedAt",
              "lastUsed",
              "templateNameModifiedAt",
              "sourceGoals")
            SELECT DISTINCT
              md5(TRIM(g.name)) "hash",
              TRIM(g.name) "name",
              adg."regionId",
              'Automatic'::"enum_GoalTemplates_creationMethod",
              min(g."createdAt") "createdAt",
              NOW() "updatedAt",
              max(g."createdAt") "lastUsed",
              NOW() "templateNameModifiedAt",
              array_agg(DISTINCT g.id) "sourceGoals"
            FROM "Goals" g
            JOIN "__all_distinct_grants" adg
            ON g.id = adg."goalId"
            WHERE adg."regionId" IS NOT NULL
            GROUP BY
              md5(TRIM(g.name)),
              TRIM(g.name),
              adg."regionId";
            ------------------------------------------------------------------------------------
            -- 3. Populate DisconnectedGoals with the goals that do not link to any grants
            INSERT INTO "DisconnectedGoals" (
              "name",
              "status",
              "timeframe",
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "closeSuspendContext",
              "endDate",
              "previousStatus")
            SELECT DISTINCT
              g."name",
              g."status",
              g."timeframe",
              g."isFromSmartsheetTtaPlan",
              g."createdAt",
              g."updatedAt",
              ("g"."closeSuspendReason"::TEXT)::"enum_DisconnectedGoals_closeSuspendReason",
              g."closeSuspendContext",
              g."endDate",
              g."previousStatus"
            FROM "Goals" g
            LEFT JOIN "__all_distinct_grants" adg
            ON g.id = adg."goalId"
            WHERE adg."goalId" is null;
            ------------------------------------------------------------------------------------
            -- 4. Populate ObjectiveTemplates
            INSERT INTO "ObjectiveTemplates" (
              "hash",
              "templateTitle",
              "regionId",
              "creationMethod",
              "createdAt",
              "updatedAt",
              "lastUsed",
              "templateTitleModifiedAt",
              "sourceObjectives")
            SELECT DISTINCT
              md5(TRIM(o.title)),
              TRIM(o.title),
              ar."regionId" "regionId",
              'Automatic'::"enum_ObjectiveTemplates_creationMethod",
              min(o."createdAt") "createdAt",
                NOW() "updatedAt",
                max(o."createdAt") "lastUsed",
                NOW() "templateNameModifiedAt",
              array_agg(DISTINCT o.id) "sourceObjectives"
            FROM "Objectives" o
            LEFT JOIN "ActivityReportObjectives" aro
            ON o."id" = aro."objectiveId"
            LEFT JOIN "ActivityReports" ar
            ON aro."activityReportId" = ar."id"
            GROUP BY
              md5(TRIM(o.title)),
              TRIM(o.title),
              ar."regionId";
            ------------------------------------------------------------------------------------
            -- 5. Populate ObjectiveTemplateTopics
            INSERT INTO "ObjectiveTemplateTopics" (
              "objectiveTemplateId",
              "topicId",
              "createdAt",
              "updatedAt")
            SELECT DISTINCT
              o.id,
              ot."topicId",
              MIN(ot."createdAt"),
              MAX(ot."updatedAt")
            FROM "ObjectiveTemplates" o
            JOIN "ObjectiveTopics" ot
            ON ot."objectiveId" = any (o."sourceObjectives"::int[])
            GROUP BY
              o.id,
              ot."topicId";
            ------------------------------------------------------------------------------------
            -- 6. Populate ObjectiveTemplateResources
            INSERT INTO "ObjectiveTemplateResources" (
              "objectiveTemplateId",
              "userProvidedUrl",
              "createdAt",
              "updatedAt")
            SELECT DISTINCT
              ot.id,
              "or"."userProvidedUrl",
              MIN("or"."createdAt"),
              MAX("or"."updatedAt")
            FROM "ObjectiveTemplates" ot
            JOIN "ObjectiveResources" "or"
            ON "or"."objectiveId" = any (ot."sourceObjectives"::int[])
            GROUP BY
              ot.id,
              "or"."userProvidedUrl";
            ------------------------------------------------------------------------------------
            -- 7. Populate discrete temp goals per grant, deduplicated and split into progressions
            CREATE TEMP TABLE "__temp_goals"
            (
                "id" serial,
                "grantId" integer,
                "name" text COLLATE pg_catalog."default",
                "status" character varying(255) COLLATE pg_catalog."default",
                "timeframe" text COLLATE pg_catalog."default",
                "isFromSmartsheetTtaPlan" boolean,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL,
                "closeSuspendReason" "enum_Goals_closeSuspendReason",
                "closeSuspendContext" text COLLATE pg_catalog."default",
                "goalTemplateId" integer,
                "onApprovedAR" boolean,
                "originalGoalIds" integer[]
            );

            WITH
              goal_data AS (
                SELECT DISTINCT
                  adg."grantId",
                  "g"."id",
                  "g"."name",
                  "g"."status",
                  "g"."timeframe",
                  "g"."isFromSmartsheetTtaPlan",
                  "g"."createdAt",
                  "g"."updatedAt",
                  "g"."closeSuspendReason",
                  "g"."closeSuspendContext",
                  adg.status AS grstatus,
                  MD5(trim(g.name)) AS gname_md5,
                  CASE COALESCE(g.status,'')
                    WHEN 'Draft' THEN 0
                    WHEN 'Not Started' THEN 1
                    WHEN 'In Progress' THEN 2
                    WHEN 'Completed' THEN 4
                    WHEN 'Closed' THEN 4
                    WHEN 'Ceased/Suspended' THEN 3
                    ELSE -1
                  END AS gstatus_num
                FROM "Goals" g
                LEFT JOIN "__all_distinct_grants" adg
                ON g."id" = adg."goalId"
              ),
              orderable_goals AS (
                SELECT
                  *,
                  ROW_NUMBER() OVER (PARTITION BY "grantId", "gname_md5" ORDER BY "updatedAt" ASC, "gstatus_num" ASC) AS "stableOrder"
                FROM goal_data
              ),
              flagged_goals AS (
                SELECT
                  *,
                  CASE
                    WHEN
                      (LEAD("gstatus_num") OVER (PARTITION BY "grantId", "gname_md5" ORDER BY "stableOrder")) < "gstatus_num"
                      OR
                      (LEAD("gstatus_num") OVER (PARTITION BY "grantId", "gname_md5" ORDER BY "stableOrder")) IS NULL
                    THEN 1
                    ELSE 0
                  END AS "retain_flag"
                FROM orderable_goals
              ),
              goal_progressions as (
                SELECT
                  *,
                  "grantId" || '-' || "gname_md5" || '-' || SUM("retain_flag") OVER (PARTITION BY "grantId", "gname_md5" ORDER BY "stableOrder" DESC ROWS UNBOUNDED PRECEDING) AS "progression_id"
                FROM flagged_goals
                ORDER BY "grantId", "gname_md5", "stableOrder"
              ),
              goal_merges as (
                SELECT
                  gpa."grantId",
                  gpa.id "primaryId",
                  gpb.id "subId"
                FROM goal_progressions gpa
                LEFT JOIN goal_progressions gpb
                ON gpa."grantId" = gpb."grantId"
                AND gpa."progression_id" = gpb."progression_id"
                AND gpa."retain_flag" = 1
                AND gpb."retain_flag" = 0
              ),
              approved_goals as (
                SELECT distinct
                  g.id "goalId",
                  bool_or(ar."calculatedStatus" = 'approved') "onApprovedAR"
                FROM "Goals" g
                LEFT JOIN "Objectives" o
                ON g.id = o."goalId"
                LEFT JOIN "ActivityReportObjectives" aro
                ON o."id" = aro."objectiveId"
                LEFT JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar."id"
                WHERE ar."regionId" is NOT NULL
                group by g.id
                order by g.id
              )
              INSERT INTO "__temp_goals" (
                "grantId",
                "name",
                "status",
                "timeframe",
                "isFromSmartsheetTtaPlan",
                "createdAt",
                "updatedAt",
                "closeSuspendReason",
                "closeSuspendContext",
                "goalTemplateId",
                "onApprovedAR",
                "originalGoalIds"
              )
              SELECT
                gda."grantId",
                gda."name",
                (array_agg(gda."status" order by gda.gstatus_num desc))[1] "status",
                (array_remove(array_agg(gdb."timeframe" order by gdb."updatedAt"),NULL))[1] "timeframe",
                SUM(COALESCE(gdb."isFromSmartsheetTtaPlan",false)::int) > 0 "isFromSmartsheetTtaPlan",
                MIN(gdb."createdAt") "createdAt",
                MAX(gdb."updatedAt") "updatedAt",
                (array_remove(array_agg(gdb."closeSuspendReason" order by gdb."updatedAt"),NULL))[1] "closeSuspendReason",
                (array_remove(array_agg(gdb."closeSuspendContext" order by gdb."updatedAt"),NULL))[1] "closeSuspendContext",
                gt.id "goalTemplateId",
                COALESCE(bool_or(ag."onApprovedAR"),false) "onApprovedAR",
                array_agg(gdb."id") "originalGoalIds"
              FROM goal_data gda
              LEFT JOIN goal_merges gm
              ON gda."grantId" = gm."grantId"
              and gda."id" = gm."primaryId"
              LEFT JOIN goal_data gdb
              ON gdb."grantId" = gm."grantId"
              and (gdb."id" = gm."primaryId"
                OR gdb."id" = gm."subId")
              JOIN "GoalTemplates" gt
              ON gda.id = any (gt."sourceGoals"::int[])
              LEFT JOIN approved_goals ag
              ON gdb."id" = ag."goalId"
              GROUP BY
                gda."grantId",
                gda."name",
                gt.id
              order by
                MIN(gdb."createdAt"),
                gda."grantId";
            ------------------------------------------------------------------------------------
            -- 8. Populate discrete temp objectives per goal per grant or other entity, deduplicated and
            --    split into progressions
            CREATE TEMP TABLE "__temp_objectives"
            (
                "id" serial,
                "otherEntityId" integer,
                "goalId" integer,
                "title" text COLLATE pg_catalog."default",
                "status" character varying(255) COLLATE pg_catalog."default",
                "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
                "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
                "objectiveTemplateId" integer,
                "onApprovedAR" boolean,
                "originalObjectiveIds" integer[]
            );

            WITH
              otherentity_objectives AS (
                SELECT DISTINCT
                  oe.id "otherEntityId",
                  aro."objectiveId"
                FROM public."OtherEntities" oe
                JOIN "ActivityRecipients" ar
                ON oe.id = ar."otherEntityId"
                JOIN "ActivityReportObjectives" aro
                ON ar."activityReportId" = aro."activityReportId"
                order by oe.id, aro."objectiveId"
              ),
              objective_otherentity_data AS (
                SELECT DISTINCT
                  oo."otherEntityId",
                  "o"."id",
                  "o"."title",
                  "o"."status",
                  "o"."createdAt",
                  "o"."updatedAt",
                  MD5(trim(o.title)) AS otitle_md5,
                  CASE COALESCE(o.status,'')
                    WHEN 'Draft' THEN 0
                    WHEN 'Not Started' THEN 1
                    WHEN 'In Progress' THEN 2
                    WHEN 'Complete' THEN 4
                    WHEN 'Suspended' THEN 3
                    ELSE -1
                  END AS ostatus_num
                FROM "Objectives" o
                JOIN "otherentity_objectives" oo
                ON o."goalId" = oo."objectiveId"
              ),
              objective_goal_data AS (
                SELECT DISTINCT
                  tg."id" "goalId",
                  "o"."id",
                  "o"."title",
                  "o"."status",
                  "o"."createdAt",
                  "o"."updatedAt",
                  MD5(trim(o.title)) AS otitle_md5,
                  CASE COALESCE(o.status,'')
                    WHEN 'Draft' THEN 0
                    WHEN 'Not Started' THEN 1
                    WHEN 'In Progress' THEN 2
                    WHEN 'Complete' THEN 4
                    WHEN 'Suspended' THEN 3
                    ELSE -1
                  END AS ostatus_num
                FROM "Objectives" o
                JOIN "__temp_goals" tg
                ON o."goalId" = any (tg."originalGoalIds"::int[])
              ),
              objective_data AS (
                SELECT
                  ood."otherEntityId",
                  null "goalId",
                  ood."id",
                  ood."title",
                  ood."status",
                  ood."createdAt",
                  ood."updatedAt",
                  ood.otitle_md5,
                  ood.ostatus_num
                FROM objective_otherentity_data ood
                UNION
                SELECT
                  null "otherEntityId",
                  ogd."goalId",
                  ogd."id",
                  ogd."title",
                  ogd."status",
                  ogd."createdAt",
                  ogd."updatedAt",
                  ogd.otitle_md5,
                  ogd.ostatus_num
                FROM objective_goal_data ogd
              ),
              orderable_objectives AS (
                SELECT
                  *,
                  ROW_NUMBER() OVER (PARTITION BY "otherEntityId", "goalId", "otitle_md5" ORDER BY "updatedAt" ASC, ostatus_num ASC) AS "stableOrder"
                FROM objective_data
              ),
              flagged_objectives AS (
                SELECT
                  *,
                  CASE
                    WHEN
                      (LEAD("ostatus_num") OVER (PARTITION BY "otherEntityId", "goalId", "otitle_md5" ORDER BY "stableOrder")) < "ostatus_num"
                      OR
                      (LEAD("ostatus_num") OVER (PARTITION BY "otherEntityId", "goalId", "otitle_md5" ORDER BY "stableOrder")) IS NULL
                    THEN 1
                    ELSE 0
                  END AS "retain_flag"
                FROM orderable_objectives
              ),
              objective_progressions as (
                SELECT
                  *,
                  "otherEntityId" || '-' || "goalId" || '-' || "otitle_md5" || '-' || SUM("retain_flag") OVER (PARTITION BY "otherEntityId", "goalId", "otitle_md5" ORDER BY "stableOrder" DESC ROWS UNBOUNDED PRECEDING) AS "progression_id"
                FROM flagged_objectives
                ORDER BY "otherEntityId", "goalId", "otitle_md5", "stableOrder"
              ),
              objective_merges as (
                SELECT
                  opa."otherEntityId",
                  opa."goalId",
                  opa.id "primaryId",
                  opb.id "subId"
                FROM objective_progressions opa
                LEFT JOIN objective_progressions opb
                ON COALESCE(opa."otherEntityId",-1) = COALESCE(opa."otherEntityId",-1)
                AND COALESCE(opa."goalId",-1) = COALESCE(opb."goalId",-1)
                AND opa."progression_id" = opb."progression_id"
                AND opa."retain_flag" = 1
                AND opb."retain_flag" = 0
              ),
              approved_objectives as (
                SELECT distinct
                  o.id "objectiveId",
                  bool_or(ar."calculatedStatus" = 'approved') "onApprovedAR"
                FROM "Objectives" o
                LEFT JOIN "ActivityReportObjectives" aro
                ON o."id" = aro."objectiveId"
                LEFT JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar."id"
                group by o.id
                order by o.id
              )
              INSERT INTO "__temp_objectives" (
                "otherEntityId",
                "goalId",
                "title",
                "status",
                "createdAt",
                "updatedAt",
                "objectiveTemplateId",
                "onApprovedAR",
                "originalObjectiveIds"
              )
              SELECT
                oda."otherEntityId",
                oda."goalId",
                oda."title",
                (array_agg(oda."status" order by oda.ostatus_num desc))[1] "status",
                MIN(odb."createdAt") "createdAt",
                MAX(odb."updatedAt") "updatedAt",
                ot.id "objectiveTemplateId",
                COALESCE(bool_or(ao."onApprovedAR"),false) "onApprovedAR",
                array_agg(odb."id") "originalObjectiveIds"
              FROM objective_data oda
              LEFT JOIN objective_merges om
              ON COALESCE(oda."otherEntityId",-1) = COALESCE(om."otherEntityId",-1)
              AND COALESCE(oda."goalId",-1) = COALESCE(om."goalId",-1)
              AND oda."id" = om."primaryId"
              LEFT JOIN objective_data odb
              ON COALESCE(odb."otherEntityId",-1) = COALESCE(om."otherEntityId",-1)
              AND COALESCE(odb."goalId",-1) = COALESCE(om."goalId",-1)
              AND (odb."id" = om."primaryId"
                OR odb."id" = om."subId")
              JOIN "ObjectiveTemplates" ot
              ON oda.id = any (ot."sourceObjectives"::int[])
              LEFT JOIN approved_objectives ao
              ON odb.id = ao."objectiveId"
              GROUP BY
                oda."otherEntityId",
                oda."goalId",
                oda."title",
                ot.id
              order by
                MIN(odb."createdAt"),
                oda."otherEntityId",
                oda."goalId";
            ------------------------------------------------------------------------------------
            -- 9. Populate  temp objectives topics
            CREATE TEMP TABLE "__temp_objectives_topics"
            (
                "id" serial,
                "objectiveId" integer NOT NULL,
                "topicId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL
            );

            INSERT INTO "__temp_objectives_topics" (
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "o"."id" "objectiveId",
              "oto"."topicId",
              MIN("oto"."createdAt"),
              MAX("oto"."updatedAt")
            FROM "ObjectiveTopics" "oto"
            JOIN "__temp_objectives" "o"
            ON "oto"."id" = any (o."originalObjectiveIds"::int[])
            GROUP BY
              "o"."id",
              "oto"."topicId";
            ------------------------------------------------------------------------------------
            -- 10. Populate  temp objectives resources
            CREATE TEMP TABLE "__temp_objectives_resources"
            (
                "id" serial,
                "userProvidedUrl" character varying(255) COLLATE pg_catalog."default" NOT NULL,
                "objectiveId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL
            );

            INSERT INTO "__temp_objectives_resources" (
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "ore"."userProvidedUrl",
              "o"."id" "objectiveId",
              MIN("ore"."createdAt"),
              MAX("ore"."updatedAt")
            FROM "ObjectiveResources" "ore"
            JOIN "__temp_objectives" "o"
            ON "ore"."id" = any (o."originalObjectiveIds"::int[])
            GROUP BY
              "ore"."userProvidedUrl",
              "o"."id";
            ------------------------------------------------------------------------------------
            -- 11. Populate temp activity report objectives
            CREATE TEMP TABLE "__temp_activity_report_objectives"
            (
                id serial,
                "activityReportId" integer NOT NULL,
                "objectiveId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
                "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
                "ttaProvided" text
            );

            INSERT INTO "__temp_activity_report_objectives" (
              "activityReportId",
              "objectiveId",
              "createdAt",
              "updatedAt",
              "ttaProvided"
            )
            SELECT
              "aro"."activityReportId",
              o."id" "objectiveId",
              MIN("aro"."createdAt"),
              MAX("aro"."updatedAt"),
              TRIM(string_agg(oo."ttaProvided", E'\n'))
            FROM "ActivityReportObjectives" aro
            JOIN "__temp_objectives" "o"
            ON "aro"."id" = any (o."originalObjectiveIds"::int[])
            JOIN "Objectives" oo
            ON aro."objectiveId" = oo.id
            GROUP BY
              "aro"."activityReportId",
              o."id";
            ------------------------------------------------------------------------------------
            -- 12. Truncate all tables that directly reference goals and objectives
            TRUNCATE TABLE
              "ActivityReportGoals",
              "ActivityReportObjectives",
              "ObjectiveRoles",
              "ObjectiveTemplateRoles",
              "ObjectiveResources",
              "ObjectiveTopics",
              "Objectives",
              "Goals",
              "GrantGoals"
            RESTART IDENTITY;
            ------------------------------------------------------------------------------------
            -- 13. Repopulate Goals from temp table
            INSERT INTO "Goals" (
              "id",
              "grantId",
              "name",
              "status",
              "timeframe",
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "closeSuspendContext",
              "goalTemplateId",
              "onApprovedAR"
            )
            SELECT
              "id",
              "grantId",
              "name",
              "status",
              "timeframe",
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "closeSuspendContext",
              "goalTemplateId",
              "onApprovedAR"
            FROM "__temp_goals";
            ------------------------------------------------------------------------------------
            -- 14. Repopulate Objectives from temp table
            INSERT INTO "Objectives"(
              "id",
              "otherEntityId",
              "goalId",
              "title",
              "status",
              "createdAt",
              "updatedAt",
              "objectiveTemplateId",
              "onApprovedAR"
            )
            SELECT
              "id",
              "otherEntityId",
              "goalId",
              "title",
              "status",
              "createdAt",
              "updatedAt",
              "objectiveTemplateId",
              "onApprovedAR"
            FROM "__temp_objectives";
            ------------------------------------------------------------------------------------
            -- 15. Repopulate ObjectiveTopics from temp table
            INSERT INTO "ObjectiveTopics" (
              "id",
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "id",
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            FROM "__temp_objectives_topics";
            ------------------------------------------------------------------------------------
            -- 16. Repopulate ObjectiveResources from temp table
            INSERT INTO "ObjectiveResources" (
              "id",
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "id",
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            FROM "__temp_objectives_resources";
            ------------------------------------------------------------------------------------
            -- 17. Repopulate ActivityReportObjectives from temp table
            INSERT INTO "ActivityReportObjectives"(
              "id",
              "activityReportId",
              "objectiveId",
              "createdAt",
              "updatedAt",
              "ttaProvided"
            )
            SELECT
              "id",
              "activityReportId",
              "objectiveId",
              "createdAt",
              "updatedAt",
              "ttaProvided"
            FROM "__temp_activity_report_objectives";
            ------------------------------------------------------------------------------------
            -- 18. Drop all temp tables used
            DROP TABLE
              "__all_distinct_grants",
              "__temp_goals",
              "__temp_objectives",
              "__temp_objectives_topics",
              "__temp_objectives_resources",
              "__temp_activity_report_objectives";
            ------------------------------------------------------------------------------------
            -- 19. Drop sourceGoals column from GoalTemplates
            ALTER TABLE "GoalTemplates"
            DROP COLUMN "sourceGoals";
            ------------------------------------------------------------------------------------
            -- 20. Drop sourceObjectives column from ObjectiveTemplates
            ALTER TABLE "ObjectiveTemplates"
            DROP COLUMN "sourceObjectives";
            ------------------------------------------------------------------------------------
            -- 21. Populate GoalTemplateObjectiveTemplates
            INSERT INTO "GoalTemplateObjectiveTemplates" (
              "objectiveTemplateId",
              "goalTemplateId"
            )
            SELECT DISTINCT
              o."objectiveTemplateId",
              g."goalTemplateId"
            FROM "Objectives" o
            JOIN "Goals" g
            ON o."goalId" = g."id";
            ------------------------------------------------------------------------------------
            -- 22. Populate goal status for all goals based on rules defined on TTAHub-813
            WITH
              rule_1 AS (
                SELECT
                  g.id "goalId",
                  'Closed' status
                FROM "Goals" g
                JOIN "Grants" gr
                ON g."grantId" = gr.id
                JOIN "Grants" gr2
                ON gr."recipientId" = gr2."recipientId"
                GROUP BY g.id
                HAVING SUM((gr2.status = 'Active')::int) = 0
                AND SUM((gr2.status = 'Inactive')::int) > 0
              ),
              rule_2 AS (
                SELECT
                  g.id "goalId",
                  'Closed' status
                FROM "Goals" g
                JOIN "Objectives" o
                ON g.id = o."goalId"
                AND o.status = 'Complete'
                JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar.id
                GROUP BY g.id
                HAVING SUM((ar."ttaType" = '{training}')::int) > 0
                AND SUM((ar."ttaType" != '{training}')::int) = 0
              ),
              rule_3 AS (
                SELECT
                  g.id "goalId",
                  'In Progress' status
                FROM "Goals" g
                JOIN "Objectives" o
                ON g.id = o."goalId"
                AND o.status in ('In Progress', 'Complete')
                JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar.id
              ),
              rule_4 AS (
                SELECT
                  g.id "goalId",
                  'Not Started' status
                FROM "Goals" g
                JOIN "Objectives" o
                ON g.id = o."goalId"
                JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar.id
                group by g.id
                having array_agg(distinct o.status)::text = '{"Not Started"}'
              ),
              rule_5 AS (
                SELECT
                  g.id "goalId",
                  'Not Started' status
                FROM "Goals" g
                LEFT JOIN "Objectives" o
                ON g.id = o."goalId"
                LEFT JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                WHERE aro.id is null
                AND g."isFromSmartsheetTtaPlan" = true
                AND NOW() - g."createdAt" < '1 year'
              ),
              rule_6 AS (
                SELECT
                  g.id "goalId",
                  'Closed' status
                FROM "Goals" g
                LEFT JOIN "Objectives" o
                ON g.id = o."goalId"
                LEFT JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                WHERE aro.id is null
                AND g."isFromSmartsheetTtaPlan" = true
                AND NOW() - g."createdAt" > '1 year'
              ),
              status_rules AS (
                SELECT
                  g.id "goalId",
                  COALESCE(g.status, r1.status,r2.status,r3.status,r4.status,r5.status,r6.status) status
                FROM "Goals" g
                LEFT JOIN rule_1 r1
                ON g.id = r1."goalId"
                LEFT JOIN rule_2 r2
                ON g.id = r2."goalId"
                LEFT JOIN rule_3 r3
                ON g.id = r3."goalId"
                LEFT JOIN rule_4 r4
                ON g.id = r4."goalId"
                LEFT JOIN rule_5 r5
                ON g.id = r5."goalId"
                LEFT JOIN rule_6 r6
                ON g.id = r6."goalId"
              )
              UPDATE "Goals" g
              SET status = sr.status
              FROM status_rules sr
              WHERE g.id = sr."goalId";
            ------------------------------------------------------------------------------------
            -- 23. Populate ActivityReportGoals
            INSERT INTO "ActivityReportGoals" (
              "activityReportId",
              "goalId"
            )
            SELECT
              aro."activityReportId",
              o."goalId"
            FROM "Objectives" o
            JOIN "ActivityReportObjectives" aro
            ON o.id = aro."objectiveId"
            WHERE o."goalId" IS NOT NULL;
            ------------------------------------------------------------------------------------
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Make goalTemplateId & grantId required
      await queryInterface.changeColumn(
        'Goals',
        'goalTemplateId',
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction },
      );

      await queryInterface.changeColumn(
        'Goals',
        'grantId',
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction },
      );

      // Make objectiveTemplateId required
      await queryInterface.changeColumn(
        'Objectives',
        'objectiveTemplateId',
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction },
      );

      // Enable logging while doing structural updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      await queryInterface.createTable('ActivityReportFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        activityReportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ActivityReports',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ActivityReportObjectiveFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        activityReporObjectivetId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ActivityReportObjectives',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectivetId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectivetTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // Disable logging while doing mass updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Realign files to use ActivityReportFiles table
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            INSERT INTO "ActivityReportFiles" (
              "activityReportId",
              "fileId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "activityReportId",
              id,
              "createdAt",
              "updatedAt"
            FROM "Files";

            ALTER TABLE "Files"
            DROP COLUMN "activityReportId";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Add first and last timestamps for each of the statuses after "Not Started"
      try {
        await queryInterface.addColumn('Goals', 'firstNotStartedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'lastNotStartedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'firstInProgressAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'lastInProgressAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'firstCeasedSuspendedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'lastCeasedSuspendedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'firstClosedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'lastClosedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'firstCompletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Goals', 'lastCompletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'firstNotStartedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'lastNotStartedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'firstInProgressAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'lastInProgressAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'firstCompleteAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'lastCompleteAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'firstSuspendedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'lastSuspendedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Enable logging while doing structural updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.dropTable('GoalTemplates', { transaction });
      await queryInterface.dropTable('ObjectiveTemplates', { transaction });
    },
  ),
};
