/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Add ITM, IST, GSM roles.
      await queryInterface.bulkInsert(
        'Roles',
        [
          {
            name: 'ITM',
            fullName: 'Interim Management Team',
            isSpecialist: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: 'IST',
            fullName: 'Integrated Service Team',
            isSpecialist: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: 'GMS',
            fullName: 'Grants Management Specialist',
            isSpecialist: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
      -- 1.) Cleanup for 'emailWhenReportSubmittedForReview' setting.
      WITH "overrides" AS (
        -- Get settings we potentially need to delete.
        SELECT
          uso.id as "overrideId",
          uso."userId",
          us.key,
          uso.value
        FROM "UserSettingOverrides" uso
        JOIN "UserSettings" us
          ON uso."userSettingId" = us.id
        WHERE us.key = 'emailWhenReportSubmittedForReview'
      ), "usersWithRoles" AS (
        -- Get array of roles for each user.
        SELECT
        ur."userId",
        ARRAY_AGG(r."name") AS roles
        FROM "UserRoles" ur
        JOIN "Roles" r
          ON ur."roleId" = r.id
        WHERE ur."userId" IN (
          SELECT DISTINCT "userId" FROM "overrides"
        )
        GROUP BY ur."userId"
      ), "toCleanUp" AS (
        -- Compare roles for each setting and delete if necessary.
        SELECT
        o."overrideId",
        o."userId",
        o.key,
        o."value",
        uwr."roles"
        FROM "overrides" o
        JOIN "usersWithRoles" uwr
          ON uwr."userId" = o."userId"
        WHERE NOT (uwr."roles"::text[] &&  ARRAY['ECM', 'GSM', 'TTAC'])
      )
      DELETE FROM "UserSettingOverrides"
      WHERE id IN (SELECT "overrideId" FROM "toCleanUp");

      -- 2.) Cleanup for 'emailWhenChangeRequested', 'emailWhenReportApproval', 'emailWhenAppointedCollaborator' settings.
      WITH "overrides" AS (
        -- Get settings we potentially need to delete.
        SELECT
          uso.id as "overrideId",
          uso."userId",
          us.key,
          uso.value
        FROM "UserSettingOverrides" uso
        JOIN "UserSettings" us
          ON uso."userSettingId" = us.id
        WHERE us.key IN ('emailWhenChangeRequested', 'emailWhenReportApproval', 'emailWhenAppointedCollaborator')
      ), "usersWithRoles" AS (
        -- Get array of roles for each user.
        SELECT
        ur."userId",
        ARRAY_AGG(r."name") AS roles
        FROM "UserRoles" ur
        JOIN "Roles" r
          ON ur."roleId" = r.id
        WHERE ur."userId" IN (
          SELECT DISTINCT "userId" FROM "overrides"
        )
        GROUP BY ur."userId"
      ), "toCleanUp" AS (
        -- Compare roles for each setting and delete if necessary.
        SELECT
        o."overrideId",
        o."userId",
        o.key,
        o."value",
        uwr."roles"
        FROM "overrides" o
        JOIN "usersWithRoles" uwr
          ON uwr."userId" = o."userId"
        WHERE NOT (uwr."roles"::text[] &&  ARRAY['ECM', 'ECS', 'FES', 'GS', 'GSM', 'HS', 'SS', 'TTAC'])
      )
      DELETE FROM "UserSettingOverrides"
      WHERE id IN (SELECT "overrideId" FROM "toCleanUp");

      -- 3.) Cleanup for 'emailWhenRecipientReportApprovedProgramSpecialist' setting.
      WITH "overrides" AS (
        -- Get settings we potentially need to delete.
        SELECT
          uso.id as "overrideId",
          uso."userId",
          us.key,
          uso.value
        FROM "UserSettingOverrides" uso
        JOIN "UserSettings" us
          ON uso."userSettingId" = us.id
        WHERE us.key  = 'emailWhenRecipientReportApprovedProgramSpecialist'
      ), "usersWithRoles" AS (
        -- Get array of roles for each user.
        SELECT
        ur."userId",
        ARRAY_AGG(r."name") AS roles
        FROM "UserRoles" ur
        JOIN "Roles" r
          ON ur."roleId" = r.id
        WHERE ur."userId" IN (
          SELECT DISTINCT "userId" FROM "overrides"
        )
        GROUP BY ur."userId"
      ), "toCleanUp" AS (
        -- Compare roles for each setting and delete if necessary.
        SELECT
        o."overrideId",
        o."userId",
        o.key,
        o."value",
        uwr."roles"
        FROM "overrides" o
        JOIN "usersWithRoles" uwr
          ON uwr."userId" = o."userId"
        WHERE NOT (uwr."roles"::text[] &&  ARRAY['PS', 'SPS', 'GMS'])
      )
      DELETE FROM "UserSettingOverrides"
      WHERE id IN (SELECT "overrideId" FROM "toCleanUp");
      `,
        { transaction }
      )
    })
  },

  async down() {},
}
