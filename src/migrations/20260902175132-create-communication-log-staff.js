const { prepMigration, removeTables } = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.createTable(
        'CommunicationLogStaff',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          communicationLogId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'CommunicationLogs',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        DROP INDEX IF EXISTS "communication_log_staff_communication_log_id_user_id_unique";
        CREATE UNIQUE INDEX "communication_log_staff_communication_log_id_user_id_unique"
          ON "CommunicationLogStaff" ("communicationLogId", "userId");
      `,
        { transaction }
      );

      // Backfill the new table from the legacy "otherStaff" JSON array. Only migrate
      // entries whose value is a numeric id that corresponds to an existing User so we
      // satisfy the foreign key. The old JSON data is intentionally left untouched.
      await queryInterface.sequelize.query(
        `
        INSERT INTO "CommunicationLogStaff" ("userId", "communicationLogId", "createdAt", "updatedAt")
        SELECT DISTINCT
          (staff->>'value')::int AS "userId",
          cl.id AS "communicationLogId",
          NOW(),
          NOW()
        FROM "CommunicationLogs" cl
        CROSS JOIN LATERAL jsonb_array_elements(
          COALESCE(cl.data->'otherStaff', '[]'::jsonb)
        ) AS staff
        WHERE staff->>'value' ~ '^[0-9]+$'
          AND EXISTS (
            SELECT 1 FROM "Users" u WHERE u.id = (staff->>'value')::int
          )
        ON CONFLICT DO NOTHING;
      `,
        { transaction }
      );
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await removeTables(queryInterface, transaction, ['CommunicationLogStaff']);
    }),
};
