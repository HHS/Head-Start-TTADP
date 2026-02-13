const { GROUP_SHARED_WITH } = require('@ttahub/common')
const { prepMigration, removeTables } = require('../lib/migration')
const { GROUP_COLLABORATORS } = require('../constants')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Add column sharedWith to table Groups of ENUM type GROUP_SHARED_WITH
      await queryInterface.addColumn(
        'Groups',
        'sharedWith',
        {
          type: Sequelize.ENUM(Object.values(GROUP_SHARED_WITH)),
          allowNull: true,
        },
        { transaction }
      )

      //---------------------------------------------------------------------------------
      await queryInterface.sequelize.query(
        /* sql */ `
        INSERT INTO "ValidFor"
        ("name", "isReport", "createdAt", "updatedAt")
        VALUES
        (
          'Groups',
          false,
          current_timestamp,
          current_timestamp
        );
      `,
        { transaction }
      )

      //---------------------------------------------------------------------------------

      await queryInterface.sequelize.query(
        `
        INSERT INTO "CollaboratorTypes"
        ("name", "validForId", "propagateOnMerge", "createdAt", "updatedAt")
        SELECT
          t.name,
          vf.id,
          t.name NOT LIKE 'Merge%',
          current_timestamp,
          current_timestamp
        FROM "ValidFor" vf
        CROSS JOIN UNNEST(ARRAY[
          ${Object.values(GROUP_COLLABORATORS)
            .map((type) => `'${type}'`)
            .join(',\n')}
        ]) t(name)
        WHERE vf.name = 'Groups'
       ;`,
        { transaction }
      )

      //---------------------------------------------------------------------------------

      await queryInterface.createTable(
        'GroupCollaborators',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          groupId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Groups',
              },
              key: 'id',
            },
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
          },
          collaboratorTypeId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'CollaboratorTypes',
              },
              key: 'id',
            },
          },
          linkBack: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
            defaultValue: null,
          },
        },
        {
          transaction,
        }
      )
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_idx"
          ON "GroupCollaborators"
          ("groupId", "userId", "collaboratorTypeId", "deletedAt");
      `,
        { transaction }
      )

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "GroupCollaborators"
          ADD CONSTRAINT "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_idx"
          UNIQUE USING INDEX "GroupCollaborators_groupId_userId_collaboratorTypeId_deletedAt_idx";
      `,
        { transaction }
      )
      //---------------------------------------------------------------------------------

      const collectGroupCollaborators = (source, typeName) => /* sql */ `
      WITH
        source_data AS (
          ${source}
        ),
        collaborator_type AS (
          SELECT
            ct.id "collaboratorTypeId"
          FROM "CollaboratorTypes" ct
          JOIN "ValidFor" vf
          ON ct."validForId" = vf.id
          WHERE ct.name = '${typeName}'
          AND vf.name = 'Groups'
        )
      INSERT INTO "GroupCollaborators"
      (
        "groupId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt"
      )
      SELECT
        sd."groupId",
        sd."userId",
        ct."collaboratorTypeId",
        sd."linkBack",
        sd."createdAt",
        sd."updatedAt"
      FROM source_data sd
      CROSS JOIN collaborator_type ct
      ON CONFLICT
      (
        "groupId",
        "userId",
        "collaboratorTypeId",
        "deletedAt"
      )
      DO UPDATE SET
        "updatedAt" = EXCLUDED."updatedAt",
        "linkBack" = (
          SELECT
            JSONB_OBJECT_AGG(key_values.key, key_values.values)
          FROM (
            SELECT
              je.key,
              JSONB_AGG(DISTINCT jae.value ORDER BY jae.value) "values"
            FROM (
              SELECT "GroupCollaborators"."linkBack"
              UNION
              SELECT EXCLUDED."linkBack"
            ) "linkBacks"("linkBack")
            CROSS JOIN jsonb_each("linkBacks"."linkBack") je
            CROSS JOIN jsonb_array_elements(je.value) jae(value)
            GROUP BY 1
          ) key_values
        )
      RETURNING
        "id" "groupCollaboratorId",
        "groupId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt";
      `

      const collectGroupCollaboratorsAsCreator = () =>
        collectGroupCollaborators(
          /* sql */ `
        SELECT
          g.id "groupId",
          g."userId",
          MIN(g."createdAt") "createdAt",
          MIN(g."createdAt") "updatedAt",
          NULL::JSONB "linkBack"
        FROM "Groups" g
        GROUP BY 1,2
        ORDER BY 1
        `,
          GROUP_COLLABORATORS.CREATOR
        )

      await queryInterface.sequelize.query(collectGroupCollaboratorsAsCreator(), { transaction })

      await queryInterface.removeColumn('Groups', 'userId', { transaction })
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.addColumn(
        'Groups',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Users',
            },
            key: 'id',
          },
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        UPDATE "Groups" g
        SET
          "userId" = gc."userId"
        FROM "GroupCollaborators" gc
        JOIN "CollaboratorTypes" ct
        ON gc."collaboratorTypeId" = ct.id
        AND ct.name = '${GROUP_COLLABORATORS.CREATOR}'
        WHERE g.id = gc."groupId";
        `,
        { transaction }
      )

      await queryInterface.changeColumn(
        'Groups',
        'userId',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      )

      await removeTables(queryInterface, transaction, ['GroupCollaborators'])

      await queryInterface.removeColumn('Groups', 'sharedWith', { transaction })
    })
  },
}
