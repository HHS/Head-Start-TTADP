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
        sourceGoal: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
        sourceObjective: {
          allowNull: false,
          type: Sequelize.INTEGER,
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

      // Move Topics from goals to objectives
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "ObjectiveTopics" ("objectiveId", "topicId", "createdAt", "updatedAt")
          SELECT
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

      // Populate GoalTemplates from existing Goals
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "GoalTemplates" ("templateName", "regionId", "creationMethod", "createdAt", "updatedAt", "lastUsed", "templateNameModifiedAt", "sourceGoal")
          SELECT DISTINCT
            g.name,
            COALESCE(gr."regionId",ar."regionId") "regionId",
            'Automatic'::"enum_GoalTemplates_creationMethod",
            NOW() "createdAt",
            NOW() "updatedAt",
            g."createdAt" "lastUsed",
            NOW() "templateNameModifiedAt",
            g.id "sourceGoal"
          FROM "Goals" g
          LEFT JOIN "Objectives" o
          ON g.id = o."goalId"
          LEFT JOIN public."ActivityReportObjectives" aro
          ON o."id" = aro."objectiveId"
          LEFT JOIN public."ActivityReports" ar
          ON aro."activityReportId" = ar."id"
          LEFT JOIN "GrantGoals" gg
          ON g.id = gg."goalId"
          LEFT JOIN public."Grants" gr
          ON gg."grantId" = gr."id"
          WHERE COALESCE(gr."regionId",ar."regionId") is NOT NULL
          ORDER BY g.id`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Migrate all goals not matched to a regionId to DisconnectedGoals as they are inaccessible
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "DisconnectedGoals" ("name", "status", "timeframe", "isFromSmartsheetTtaPlan", "createdAt", "updatedAt", "closeSuspendReason", "closeSuspendContext", "endDate", "previousStatus")
          SELECT DISTINCT
            "g"."name",
            "g"."status",
            "g"."timeframe",
            "g"."isFromSmartsheetTtaPlan",
            "g"."createdAt",
            "g"."updatedAt",
            ("g"."closeSuspendReason"::TEXT)::"enum_DisconnectedGoals_closeSuspendReason",
            "g"."closeSuspendContext",
            "g"."endDate",
            "g"."previousStatus"
          FROM "Goals" g
          LEFT JOIN "Objectives" o
          ON g.id = o."goalId"
          LEFT JOIN "ActivityReportObjectives" aro
          ON o."id" = aro."objectiveId"
          LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar."id"
          LEFT JOIN "GrantGoals" gg
          ON g.id = gg."goalId"
          LEFT JOIN "Grants" gr
          ON gg."grantId" = gr."id"
          WHERE COALESCE(gr."regionId",ar."regionId") IS NULL;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Populate ObjectiveTemplates from existing Objectives linking to GoalTemplates
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "ObjectiveTemplates" ("templateTitle", "regionId", "creationMethod", "createdAt", "updatedAt", "lastUsed", "templateTitleModifiedAt", "sourceObjective")
          SELECT DISTINCT
            o.title,
            COALESCE(ar."regionId") "regionId",
            'Automatic'::"enum_ObjectiveTemplates_creationMethod",
            NOW() "createdAt",
            NOW() "updatedAt",
            o."createdAt" "lastUsed",
            NOW() "templateTitleModifiedAt",
            o.id "sourceObjective"
          FROM "Objectives" o
          LEFT JOIN "ActivityReportObjectives" aro
          ON o."id" = aro."objectiveId"
          LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar."id"`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `INSERT INTO "ObjectiveTemplateTopics" ("objectiveTemplateId", "topicId", "createdAt", "updatedAt")
          SELECT
            o.id,
            ot."topicId",
            ot."createdAt",
            ot."updatedAt"
          FROM "ObjectiveTemplates" o
          JOIN "ObjectiveTopics" ot
          ON o."sourceObjective" = ot."objectiveId";`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `INSERT INTO "ObjectiveTemplateResources" ("objectiveTemplateId", "userProvidedUrl", "createdAt", "updatedAt")
          SELECT
            ot.id,
            "or"."userProvidedUrl",
            "or"."createdAt",
            "or"."updatedAt"
          FROM "ObjectiveTemplates" ot
          JOIN "ObjectiveResources" "or"
          ON ot."sourceObjective" = "or"."objectiveId";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

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

        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempGoalsONApprovedARs" AS
            SELECT distinct
              g.id "goalId",
              bool_or(gg.id IS NOT null) OR bool_or(ar."calculatedStatus" = 'approved') "onApprovedAR"
            FROM "Goals" g
            LEFT JOIN "Objectives" o
            ON g.id = o."goalId"
            LEFT JOIN "ActivityReportObjectives" aro
            ON o."id" = aro."objectiveId"
            LEFT JOIN "ActivityReports" ar
            ON aro."activityReportId" = ar."id"
            LEFT JOIN "GrantGoals" gg
            ON g.id = gg."goalId"
            LEFT JOIN "Grants" gr
            ON gg."grantId" = gr."id"
            WHERE COALESCE(gr."regionId",ar."regionId") is NOT NULL
            group by g.id
            order by g.id;

            UPDATE ONLY "Goals"
            SET "onApprovedAR" = goaa."onApprovedAR"
            FROM "TempGoalsONApprovedARs" goaa
            WHERE "Goals"."id" = goaa."goalId";
          END$$;`,
          { transaction },
        );
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

        await queryInterface.addColumn('Objectives', 'onApprovedAR', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          default: false,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'precededBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('Objectives', 'supersededBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });

        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
          CREATE TEMP TABLE "TempObjectivesONApprovedARs" AS
            SELECT distinct
              o.id "objectiveId",
              bool_or(gg.id IS NOT null) OR bool_or(ar."calculatedStatus" = 'approved') "onApprovedAR"
            FROM "Goals" g
            LEFT JOIN "Objectives" o
            ON g.id = o."goalId"
            LEFT JOIN "ActivityReportObjectives" aro
            ON o."id" = aro."objectiveId"
            LEFT JOIN "ActivityReports" ar
            ON aro."activityReportId" = ar."id"
            LEFT JOIN "GrantGoals" gg
            ON g.id = gg."goalId"
            LEFT JOIN "Grants" gr
            ON gg."grantId" = gr."id"
            WHERE COALESCE(gr."regionId",ar."regionId") is NOT NULL
            group by o.id
            order by o.id;

            UPDATE ONLY "Objectives"
            SET "onApprovedAR" = ooaa."onApprovedAR"
            FROM "TempObjectivesONApprovedARs" ooaa
            WHERE "Objectives"."id" = ooaa."objectiveId";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Clean up Roles and add isSpecialist columns
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

          TRUNCATE TABLE
            "Roles",
            "RoleTopics",
            "ObjectiveRoles",
            "ObjectiveTemplateRoles"
          RESTART IDENTITY;

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

          UPDATE ONLY "Roles"
          SET "isSpecialist" = true
          WHERE "fullName" in (
            'Family Engagement Specialist',
            'Health Specialist',
            'Early Childhood Specialist',
            'System Specialist',
            'Grantee Specialist'
          );

          UPDATE ONLY "Roles" r1
          SET
            "deletedAt" = NOW(),
            "mapsTo" = r2.id
          FROM "Roles" r2
          WHERE r1."fullName" = 'Grants Specialist'
          AND r2."fullName" = 'Grantee Specialist';

          DROP TABLE "TempRoles";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // populate Goals, TopicGoals, Objectives, ObjectiveTopics, & ObjectiveResources
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempGoals"
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
                "onApprovedAR" boolean
            );

            CREATE TEMP TABLE "TempObjectives"
            (
                "id" serial,
                "goalId" integer,
                "title" text COLLATE pg_catalog."default",
                "ttaProvided" text COLLATE pg_catalog."default",
                "status" character varying(255) COLLATE pg_catalog."default",
                "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
                "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
                "objectiveTemplateId" integer,
                "onApprovedAR" boolean
            );

            CREATE TEMP TABLE "TempObjectiveTopics"
            (
                "id" serial,
                "objectiveId" integer NOT NULL,
                "topicId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL
            );

            CREATE TEMP TABLE "TempObjectiveResources"
            (
                "id" serial,
                "userProvidedUrl" character varying(255) COLLATE pg_catalog."default" NOT NULL,
                "objectiveId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL
            );

            CREATE TEMP TABLE "TempActivityReportObjectives"
            (
                id serial,
                "activityReportId" integer NOT NULL,
                "objectiveId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
                "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
            );

            INSERT INTO "TempGoals" (
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
            SELECT DISTINCT
              COALESCE("ars"."grantId","gg"."grantId") "grantId",
              "g"."name",
              "g"."status",
              "g"."timeframe",
              "g"."isFromSmartsheetTtaPlan",
              "g"."createdAt",
              "g"."updatedAt",
              "g"."closeSuspendReason",
              "g"."closeSuspendContext",
              "gt"."id" "goalTemplateId",
              "g"."onApprovedAR"
            FROM "Goals" g
            LEFT JOIN "Objectives" o
            ON g.id = o."goalId"
            LEFT JOIN "ActivityReportObjectives" aro
            ON o."id" = aro."objectiveId"
            LEFT JOIN "ActivityReports" ar
            ON aro."activityReportId" = ar."id"
            LEFT JOIN "ActivityRecipients" ars
            ON ar."id" = ars."activityReportId"
            LEFT JOIN "GrantGoals" gg
            ON g.id = gg."goalId"
            LEFT JOIN "Grants" gr
            ON gg."grantId" = gr."id"
            JOIN "GoalTemplates" "gt"
            ON "g"."id" = "gt"."sourceGoal"
            WHERE COALESCE(gr."regionId",ar."regionId") is NOT NULL;

            INSERT INTO "TempObjectives" (
              "goalId",
              "title",
              "ttaProvided",
              "status",
              "createdAt",
              "updatedAt",
              "objectiveTemplateId",
              "onApprovedAR"
            )
            select
              "g"."id" "goalId",
              "o"."title",
              "o"."ttaProvided",
              "o"."status",
              "o"."createdAt",
              "o"."updatedAt",
              "ot"."id" "objectiveTemplateId",
              "o"."onApprovedAR"
            FROM "Objectives" "o"
            JOIN "ObjectiveTemplates" "ot"
            ON "o"."id" = "ot"."sourceObjective"
            LEFT JOIN "GoalTemplates" "gt"
            ON "gt"."sourceGoal" = "o"."goalId"
            LEFT JOIN "TempGoals" "g"
            ON "gt"."id" = "g"."goalTemplateId";

            INSERT INTO "TempObjectiveTopics" (
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "o"."id" "objectiveId",
              "oto"."topicId",
              "oto"."createdAt",
              "oto"."updatedAt"
            FROM "ObjectiveTopics" "oto"
            JOIN "ObjectiveTemplates" "ote"
            ON "oto"."objectiveId" = "ote"."sourceObjective"
            JOIN "TempObjectives" "o"
            ON "ote"."id" = "o"."objectiveTemplateId";

            INSERT INTO "TempObjectiveResources" (
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "ore"."userProvidedUrl",
              "o"."id" "objectiveId",
              "ore"."createdAt",
              "ore"."updatedAt"
            FROM "ObjectiveResources" "ore"
            JOIN "ObjectiveTemplates" "ote"
            ON "ore"."objectiveId" = "ote"."sourceObjective"
            JOIN "TempObjectives" "o"
            ON "ote"."id" = "o"."objectiveTemplateId";

            INSERT INTO "TempActivityReportObjectives" (
              "activityReportId",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "aro"."activityReportId",
              o."id" "objectiveId",
              "aro"."createdAt",
              "aro"."updatedAt"
            FROM "ActivityReportObjectives" aro
            JOIN "ObjectiveTemplates" ot
            ON aro."objectiveId" = ot."sourceObjective"
            JOIN "TempObjectives" o
            ON ot.id = o."objectiveTemplateId";

            TRUNCATE TABLE
              "ActivityReportObjectives",
              "ObjectiveRoles",
              "ObjectiveTemplateRoles",
              "ObjectiveResources",
              "ObjectiveTopics",
              "Objectives",
              "Goals",
              "GrantGoals"
            RESTART IDENTITY;

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
              "goalTemplateId"
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
              "goalTemplateId"
            FROM "TempGoals";

            INSERT INTO "Objectives"(
              "id",
              "goalId",
              "title",
              "ttaProvided",
              "status",
              "createdAt",
              "updatedAt",
              "objectiveTemplateId"
            )
            SELECT
              "id",
              "goalId",
              "title",
              "ttaProvided",
              "status",
              "createdAt",
              "updatedAt",
              "objectiveTemplateId"
            FROM "TempObjectives";

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
            FROM "TempObjectiveTopics";

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
            FROM "TempObjectiveResources";

            INSERT INTO "ActivityReportObjectives"(
              "id",
              "activityReportId",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              "id",
              "activityReportId",
              "objectiveId",
              "createdAt",
              "updatedAt"
            FROM "TempActivityReportObjectives";

            DROP TABLE
              "TempGoals",
              "TempObjectives",
              "TempObjectiveTopics",
              "TempObjectiveResources",
              "TempActivityReportObjectives";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Remove unneeded source columns
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            ALTER TABLE "GoalTemplates"
            DROP COLUMN "sourceGoal";

            ALTER TABLE "ObjectiveTemplates"
            DROP COLUMN "sourceObjective";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Remove duplicate templates and realign references duplicates to first instance
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempObjectiveTemplatesReductionMap" AS
            SELECT
              otA.id "primaryTemplateId",
              otB.id "secondaryTemplateId",
              otA."regionId",
              otB."lastUsed"
            FROM "ObjectiveTemplates" otA
            JOIN "ObjectiveTemplates" otB
            ON otA.id < otB.id
            AND otA."templateTitle" = otB."templateTitle"
            AND COALESCE(otA."regionId",-1) = COALESCE(otB."regionId",-1);

            UPDATE ONLY "Objectives"
            SET "objectiveTemplateId" = otrm."primaryTemplateId"
            FROM "TempObjectiveTemplatesReductionMap" otrm
            WHERE "objectiveTemplateId" = otrm."secondaryTemplateId";

            UPDATE ONLY "ObjectiveTemplateResources"
            SET "objectiveTemplateId" = otrm."primaryTemplateId"
            FROM "TempObjectiveTemplatesReductionMap" otrm
            WHERE "objectiveTemplateId" = otrm."secondaryTemplateId";

            UPDATE ONLY "ObjectiveTemplateTopics"
            SET "objectiveTemplateId" = otrm."primaryTemplateId"
            FROM "TempObjectiveTemplatesReductionMap" otrm
            WHERE "objectiveTemplateId" = otrm."secondaryTemplateId";

            DELETE FROM "ObjectiveTemplates" ot
            USING  "TempObjectiveTemplatesReductionMap" otrm
            WHERE ot.id = otrm."secondaryTemplateId";

            DELETE FROM "ObjectiveTemplateResources" otrA
            USING "ObjectiveTemplateResources" otrB
            WHERE otrA.id > otrB.id
            AND otrA."objectiveTemplateId" = otrB."objectiveTemplateId"
            AND otrA."userProvidedUrl" = otrB."userProvidedUrl";

            DELETE FROM "ObjectiveTemplateTopics" ottA
            USING "ObjectiveTemplateTopics" ottB
            WHERE ottA.id > ottB.id
            AND ottA."objectiveTemplateId" = ottB."objectiveTemplateId"
            AND ottA."topicId" = ottB."topicId";

            CREATE TEMP TABLE "TempObjectiveTemplatesReductionMapLastUsed" AS
            SELECT
              "primaryTemplateId",
              min("lastUsed") "lastUsed"
            FROM "TempObjectiveTemplatesReductionMap"
            GROUP BY "primaryTemplateId";

            UPDATE ONLY "ObjectiveTemplates"
            SET "lastUsed" = otrm."lastUsed"
            FROM "TempObjectiveTemplatesReductionMapLastUsed" otrm
            WHERE "ObjectiveTemplates".id = otrm."primaryTemplateId"
            AND "ObjectiveTemplates"."lastUsed" < otrm."lastUsed";

            CREATE TEMP TABLE "TempGoalTemplatesReductionMap" AS
            SELECT
              gtA.id "primaryTemplateId",
              gtB.id "secondaryTemplateId",
              gtA."regionId",
              gtB."lastUsed"
            FROM "GoalTemplates" gtA
            JOIN "GoalTemplates" gtB
            ON gtA.id < gtB.id
            AND gtA."templateName" = gtB."templateName"
            AND COALESCE(gtA."regionId",-1) = COALESCE(gtB."regionId",-1);

            UPDATE ONLY "Goals"
            SET "goalTemplateId" = gtrm."primaryTemplateId"
            FROM "TempGoalTemplatesReductionMap" gtrm
            WHERE "goalTemplateId" = gtrm."secondaryTemplateId";

            DELETE FROM "GoalTemplates" gt
            USING  "TempGoalTemplatesReductionMap" gtrm
            WHERE gt.id = gtrm."secondaryTemplateId";

            CREATE TEMP TABLE "TempGoalTemplatesReductionMapLastUsed" AS
            SELECT
              "primaryTemplateId",
              min("lastUsed") "lastUsed"
            FROM "TempGoalTemplatesReductionMap"
            GROUP BY "primaryTemplateId";

            UPDATE ONLY "GoalTemplates"
            SET "lastUsed" = gtrm."lastUsed"
            FROM "TempGoalTemplatesReductionMapLastUsed" gtrm
            WHERE "GoalTemplates".id = gtrm."primaryTemplateId"
            AND "GoalTemplates"."lastUsed" > gtrm."lastUsed";

            DROP TABLE
              "TempObjectiveTemplatesReductionMap",
              "TempGoalTemplatesReductionMap",
              "TempObjectiveTemplatesReductionMapLastUsed",
              "TempGoalTemplatesReductionMapLastUsed";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Populate GoalTemplateObjectiveTemplates linking  ObjectiveTemplates to GoalTemplates
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "GoalTemplateObjectiveTemplates" ("objectiveTemplateId", "goalTemplateId")
          SELECT DISTINCT o."objectiveTemplateId", g."goalTemplateId"
          FROM "Objectives" o
          JOIN "Goals" g
          ON o."goalId" = g."id";`,
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
            INSERT INTO "ActivityReportFiles" ("activityReportId", "fileId", "createdAt", "updatedAt")
            SELECT "activityReportId", id, "createdAt", "updatedAt"
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

      // Populate goal status for all current goals based on rules defined on TTAHub-813
      // If the goal is associated with a recipient that only has inactive grants
      // > all goals = closed
      // If the goal is associated with an AR is for training, and the objective status is Completed
      // > goal status = closed
      // If the goal is associated with an AR and objective is In progress or Completed
      // > goals status = in progress
      // If the goal is associated with an AR and only associated with Not started objective(s)
      // > goals status = not started
      // If the goal doesn't have a status and no associated ARs and imported from RTTAPA less than
      // or equal to 1yr ago > goal status = not started
      // If the goal doesn't have a status and no associated ARs and imported over 1 yr ago
      // > goal status = closed
      try {
        await queryInterface.sequelize.query(
          `UPDATE "Goals" g0
          SET status = COALESCE(r1.status,r2.status,r3.status,r4.status,r5.status,r6.status)
          FROM "Goals" g
          LEFT JOIN (
            SELECT
              g.id "goalId",
              true "rule",
              'Closed' status
            FROM "Goals" g
            JOIN "Grants" gr
            ON g."grantId" = gr.id
            JOIN "Grants" gr2
            ON gr."recipientId" = gr2."recipientId"
            GROUP BY g.id
            HAVING SUM((gr2.status = 'Active')::int) = 0
            AND SUM((gr2.status = 'Inactive')::int) > 0
          ) r1
          on g.id = r1."goalId"
          LEFT JOIN (
            SELECT
              g.id "goalId",
              true "rule",
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
          ) r2
          on g.id = r2."goalId"
          LEFT JOIN (
            SELECT
              g.id "goalId",
              true "rule",
              'In Progress' status
            FROM "Goals" g
            JOIN "Objectives" o
            ON g.id = o."goalId"
            AND o.status in ('In Progress', 'Complete')
            JOIN "ActivityReportObjectives" aro
            ON o.id = aro."objectiveId"
            JOIN "ActivityReports" ar
            ON aro."activityReportId" = ar.id
          ) r3
          on g.id = r3."goalId"
          LEFT JOIN (
            SELECT
              g.id "goalId",
              true "rule",
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
          ) r4
          on g.id = r4."goalId"
          LEFT JOIN (
            SELECT
              g.id "goalId",
              true "rule",
              'Not Started' status
            FROM "Goals" g
            LEFT JOIN "Objectives" o
            ON g.id = o."goalId"
            LEFT JOIN "ActivityReportObjectives" aro
            ON o.id = aro."objectiveId"
            WHERE aro.id is null
            AND g."isFromSmartsheetTtaPlan" = true
            AND NOW() - g."createdAt" < '1 year'
          ) r5
          on g.id = r5."goalId"
          LEFT JOIN (
            SELECT
              g.id "goalId",
              true "rule",
              'Closed' status
            FROM "Goals" g
            LEFT JOIN "Objectives" o
            ON g.id = o."goalId"
            LEFT JOIN "ActivityReportObjectives" aro
            ON o.id = aro."objectiveId"
            WHERE aro.id is null
            AND g."isFromSmartsheetTtaPlan" = true
            AND NOW() - g."createdAt" > '1 year'
          ) r6
          on g.id = r6."goalId"
          WHERE g0.id = g.id;`,
          { transaction },
        );
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
