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

      // Add GoalTemplates table
      queryInterface.createTable('GoalTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        templateName: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
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
      queryInterface.createTable('ObjectiveTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        templateTitle: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        // To support up/down on the migration
        goalTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
        },
        // To support up/down on the migration
        sourceObjective: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          `INSERT INTO "GoalTemplates" ("templateName","createdAt","updatedAt","sourceGoal")
          SELECT name, NOW(), NOW(), id
          FROM "Goals";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Populate ObjectiveTemplates from existing Objectives linking to GoalTemplates
      try {
        await queryInterface.sequelize.query(
          `INSERT INTO "ObjectiveTemplates" ("templateTitle","createdAt","updatedAt","goalTemplateId", "sourceObjective")
          SELECT o.title, NOW(), NOW(), gt.id, o.id
          FROM "Objectives" o
          JOIN "GoalTemplates" gt
          ON o."goalId" = gt."sourceGoal";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Add the foreign key relation from Goals table to GoalTemplates for recording the parent
      // template leave goalTemplateId nullable for now until it can be populated with the IDs of
      // the parent templates
      queryInterface.addColumn('Goals', 'goalTemplateId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'goalTemplates',
          },
          key: 'id',
        },
        onUpdate: 'CASCADE',
      }, { transaction });

      // Add the foreign key relation from Objectives table to ObjectiveTemplates for recording the
      // parent template leave goalTemplateId nullable for now until it can be populated with the
      // IDs of the parent templates
      queryInterface.addColumn('Objectives', 'objectiveTemplateId', {
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

      // populate goals
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempGoals"
            (
                id integer NOT NULL DEFAULT nextval('"TempGrants_id_seq"'::regclass),
              "grantId" integer,
                name text COLLATE pg_catalog."default",
                status character varying(255) COLLATE pg_catalog."default",
                timeframe text COLLATE pg_catalog."default",
                "isFromSmartsheetTtaPlan" boolean,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL,
                "closeSuspendReason" "enum_Goals_closeSuspendReason",
                "closeSuspendContext" text COLLATE pg_catalog."default",
              "goalTemplateId" integer,
                CONSTRAINT "TempGrants_pkey" PRIMARY KEY (id)
            );

            INSERT INTO "TempGoals" (
              "grantId",
              name,
              status,
              timeframe,
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "goalTemplateId"
            )
            select
              gg."grantId",
              g.name,
              g.status,
              g.timeframe,
              g."isFromSmartsheetTtaPlan",
              g."createdAt",
              g."updatedAt",
              g."closeSuspendReason",
              g."closeSuspendContext"--,
              gt.id "goalTemplateId"
            From "GrantGoals" gg
            JOIN "Goals" g
            ON gg."goalId" = g.id
            JOIN "GoalTemplates" gt
            ON g.id = gt."sourceGoal";

            SET CONSTRAINTS ALL DEFERRED;

            TRUNCATE TABLE "Goals" RESTART IDENTITY;

            INSERT INTO "Goals" (
              id,
              "grantId",
              name,
              status,
              timeframe,
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "goalTemplateId"
            )
            SELECT
              id,
              "grantId",
              name,
              status,
              timeframe,
              "isFromSmartsheetTtaPlan",
              "createdAt",
              "updatedAt",
              "closeSuspendReason",
              "goalTemplateId"
            FROM "TempGoals";

            DROP TABLE "TempGoals";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // populate objectives
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempObjectives"
            (
                id integer NOT NULL DEFAULT nextval('"TempObjectives_id_seq"'::regclass),
                "goalId" integer,
                title text COLLATE pg_catalog."default",
                "ttaProvided" text COLLATE pg_catalog."default",
                status character varying(255) COLLATE pg_catalog."default",
                "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
                "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
                "goalId" integer,
                CONSTRAINT "TempObjectives_pkey" PRIMARY KEY (id)
            );

            INSERT INTO "TempObjectives" (
              "goalId",
              title,
              "ttaProvided",
              status,
              "createdAt",
              "updatedAt",
              "objectiveTemplateId"
            )
            select
              g."id" "goalId",
              o.title,
              o."ttaProvided",
              o.status,
              o."createdAt",
              o."updatedAt",
              ot.id "objectiveTemplateId"
            FROM "GoalTemplates" gt
            JOIN "Goals" g
            ON gt.id = g."goalTemplateId"
            JOIN "Objectives" o
            ON gt."sourceGoal" = o."goalId"
            JOIN "ObjectiveTemplates" ot
            ON o.id = ot."sourceObjective";

            SET CONSTRAINTS ALL DEFERRED;

            TRUNCATE TABLE "Objectives" RESTART IDENTITY;

            INSERT INTO "Objectives"(
              id,
              "goalId",
              title,
              "ttaProvided",
              status,
              "createdAt",
              "updatedAt",
              "objectiveTemplateId"
            )
            SELECT
              id,
              "goalId",
              title,
              "ttaProvided",
              status,
              "createdAt",
              "updatedAt",
              "objectiveTemplateId"
            FROM "TempObjectives";

            DROP TABLE "TempObjectives";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // populate ObjectiveTopics
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempObjectiveTopics"
            (
                id integer NOT NULL DEFAULT nextval('"TempObjectiveTopics_id_seq"'::regclass),
                "objectiveId" integer NOT NULL,
                "topicId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "TempObjectiveTopics_pkey" PRIMARY KEY (id)
            );

            INSERT INTO "TempObjectiveTopics" (
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              o.id "objectiveId",
              oto."topicId",
              oto."createdAt",
              oto."updatedAt"
            FROM "ObjectiveTopics" oto
            JOIN "ObjectiveTemplates" ote
            ON oto."objectiveId" = ote."sourceObjective"
            JOIN "Objective" o
            ON ote.id = o."objectiveTemplateId";

            SET CONSTRAINTS ALL DEFERRED;

            TRUNCATE TABLE "ObjectiveTopics" RESTART IDENTITY;

            INSERT INTO "ObjectiveTopics" (
              id
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              id,
              "objectiveId",
              "topicId",
              "createdAt",
              "updatedAt"
            FROM "TempObjectiveTopics";z

            DROP TABLE "TempObjectiveTopics";
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // populate ObjectiveTopics
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempObjectiveResources"
            (
                id integer NOT NULL DEFAULT nextval('"TempObjectiveResources_id_seq"'::regclass),
                "userProvidedUrl" character varying(255) COLLATE pg_catalog."default" NOT NULL,
                "objectiveId" integer NOT NULL,
                "createdAt" timestamp with time zone NOT NULL,
                "updatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "TempObjectiveResources_pkey" PRIMARY KEY (id)
            );

            INSERT INTO "TempObjectiveResources" (
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              ore."userProvidedUrl"
              "o".id objectiveId",
              ore."createdAt",
              ore."updatedAt"
            FROM "ObjectiveResources" ore
            JOIN "ObjectiveTemplates" ote
            ON ore."objectiveId" = ote."sourceObjective"
            JOIN "Objective" o
            ON ote.id = o."objectiveTemplateId";

            SET CONSTRAINTS ALL DEFERRED;

            TRUNCATE TABLE "ObjectiveResources" RESTART IDENTITY;

            INSERT INTO "ObjectiveResources" (
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            )
            SELECT
              id,
              "userProvidedUrl",
              "objectiveId",
              "createdAt",
              "updatedAt"
            FROM "TempObjectiveResources";

            DROP TABLE "TempObjectiveResources";
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

      // Make goalTemplateId required
      queryInterface.changeColumn('Goals', 'goalTemplateId', { allowNull: false }, { transaction });

      // Make objectiveTemplateId required
      queryInterface.changeColumn('Objectives', 'objectiveTemplateId', { allowNull: false }, { transaction });

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
      queryInterface.dropTable('GoalTemplates', { transaction });
      queryInterface.dropTable('ObjectiveTemplates', { transaction });
    },
  ),
};
