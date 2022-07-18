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

      try {
        await queryInterface.addColumn('Topics', 'mapsTo', {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
        }, { transaction });

        await queryInterface.sequelize.query(
          `DO $$
          ------------------------------------------------------------------------------------
          BEGIN
            CREATE TEMP TABLE "__temp_TopicGoals" (
              id integer NOT NULL,
              "topicId" integer NOT NULL,
              "goalId" integer NOT NULL,
              "createdAt" timestamp with time zone NOT NULL,
              "updatedAt" timestamp with time zone NOT NULL
            );
            ------------------------------------------------------------------------------------
            ALTER TABLE "Topics"
            DROP CONSTRAINT "Topics_name_key";
            ------------------------------------------------------------------------------------
            ALTER TABLE "Topics"
            ADD CONSTRAINT "Topics_name_key" UNIQUE (name, "deletedAt", "mapsTo");
            ------------------------------------------------------------------------------------
          END$$;`,
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

      await queryInterface.sequelize.query(
        `DO $$
        ------------------------------------------------------------------------------------
        DELETE FROM "Topic"
        WHERE "deletedAt" IS NOT NULL;
        ------------------------------------------------------------------------------------
        DELETE FROM "TopicGoals";
        ------------------------------------------------------------------------------------
        ALTER TABLE "Topics"
        DROP CONSTRAINT "Topics_name_key";
        ------------------------------------------------------------------------------------
        ALTER TABLE "Topics"
        ADD CONSTRAINT "Topics_name_key" UNIQUE (name);
        END$$;`,
        { transaction },
      );

      queryInterface.removeColumn('Topics', 'mapsTo');

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
};
