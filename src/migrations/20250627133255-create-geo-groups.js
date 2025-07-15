const { prepMigration } = require('../lib/migration');
const { REGIONS } = require('../constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      const CREATOR_ID = 765;
      const COLLABORATOR_ID = 654;

      // Insert users if missing
      await queryInterface.sequelize.query(
        `
        INSERT INTO "Users" (id, name, "hsesUserId", "hsesUsername", email, "createdAt", "updatedAt")
        VALUES (:id, :name, :hsesUserId, :hsesUsername, :email, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            id: CREATOR_ID, name: 'Heather', hsesUserId: '55174', hsesUsername: 'heather@example.com', email: 'heather@example.com',
          },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO "Users" (id, name, "hsesUserId", "hsesUsername", email, "createdAt", "updatedAt")
        VALUES (:id, :name, :email, :hsesUserId, :hsesUsername, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        `,
        {
          replacements: {
            id: COLLABORATOR_ID, name: 'Tammy', hsesUserId: '53719', hsesUsername: 'tammy@example.com', email: 'tammy@example.com',
          },
          transaction,
        },
      );

      // Insert Groups, returning ids
      const insertedGroupResults = await Promise.all(
        REGIONS.map((region) => queryInterface.sequelize.query(
          `
            INSERT INTO "Groups" ("name", "isPublic", "createdAt", "updatedAt")
            VALUES (:name, true, NOW(), NOW())
            ON CONFLICT ("name") DO UPDATE SET "isPublic" = EXCLUDED."isPublic"
            RETURNING "id";
            `,
          {
            replacements: { name: region },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          },
        )),
      );

      // Extract ids
      const groupIds = insertedGroupResults.map((rows) => rows[0].id);

      // We need to ensure the CollaboratorTypes exist for Groups.
      await queryInterface.sequelize.query(`
        INSERT INTO "CollaboratorTypes" (id, name, "validForId", "propagateOnMerge", "mapsTo", "createdAt", "updatedAt")
        VALUES
          (13, 'Creator', 3, true, NULL, NOW(), NOW()),
          (14, 'Co-Owner', 3, true, NULL, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, { transaction });

      // Build all collaborators in bulk
      const now = new Date();
      const collaborators = groupIds.flatMap((groupId) => ([
        {
          groupId,
          userId: CREATOR_ID,
          collaboratorTypeId: 13, // Creator
          createdAt: now,
          updatedAt: now,
        },
        {
          groupId,
          userId: COLLABORATOR_ID,
          collaboratorTypeId: 14, // Collaborator
          createdAt: now,
          updatedAt: now,
        },
      ]));

      await queryInterface.bulkInsert('GroupCollaborators', collaborators, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Remove all GroupCollaborators for these groups
      await queryInterface.sequelize.query(
        `
          DELETE FROM "GroupCollaborators"
          WHERE "groupId" IN (
            SELECT "id" FROM "Groups" WHERE "name" IN (:regions)
          );
        `,
        {
          replacements: { regions: REGIONS },
          transaction,
        },
      );

      // Remove the groups
      await queryInterface.bulkDelete('Groups', {
        name: { [Sequelize.Op.in]: REGIONS },
      }, { transaction });
    });
  },
};
