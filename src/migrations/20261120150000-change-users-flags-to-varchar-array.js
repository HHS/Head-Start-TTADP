const { prepMigration } = require('../lib/migration');

/**
 * Users.flags was an array of the "enum_Users_flags" enum. Sequelize caches enum OIDs when the app
 * starts, so after a database restore (which recreates the type with a new OID) flags were returned
 * as a raw string like "{flag_a,flag_b}" until the app restarted. Store flags as a plain string array
 * instead; allowed values are validated in the User model against FEATURE_FLAGS.
 */
// The enum labels as they were before this migration, frozen so rollback restores the same type
// even after FEATURE_FLAGS changes.
const LEGACY_ENUM_LABELS = [
  'quality_assurance_dashboard',
  'actionable_notifications',
  'tta_timeline',
  'recipient_tta_request',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "Users" ALTER COLUMN "flags" DROP DEFAULT;
        ALTER TABLE "Users"
          ALTER COLUMN "flags" TYPE VARCHAR(255)[] USING ("flags"::text[]);
        ALTER TABLE "Users" ALTER COLUMN "flags" SET DEFAULT '{}';
        DROP TYPE IF EXISTS "enum_Users_flags";
      `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Refuse to roll back rather than silently dropping flags the old enum can't hold.
      const [unrepresentable] = await queryInterface.sequelize.query(
        `
        SELECT DISTINCT f AS flag
          FROM "Users", unnest("flags") AS f
          WHERE f NOT IN (:labels)
          ORDER BY 1;
      `,
        { transaction, replacements: { labels: LEGACY_ENUM_LABELS } }
      );
      if (unrepresentable.length) {
        const values = unrepresentable.map(({ flag }) => flag).join(', ');
        throw new Error(
          `Cannot convert Users.flags back to "enum_Users_flags": stored flags not in the legacy enum: ${values}. Remove them (removeUsersFlags) or extend the enum before rolling back.`
        );
      }

      await queryInterface.sequelize.query(
        `
        CREATE TYPE "enum_Users_flags" AS ENUM (:labels);
        ALTER TABLE "Users" ALTER COLUMN "flags" DROP DEFAULT;
        ALTER TABLE "Users"
          ALTER COLUMN "flags" TYPE "enum_Users_flags"[] USING ("flags"::text[]::"enum_Users_flags"[]);
        ALTER TABLE "Users" ALTER COLUMN "flags" SET DEFAULT ARRAY[]::"enum_Users_flags"[];
      `,
        { transaction, replacements: { labels: LEGACY_ENUM_LABELS } }
      );
    });
  },
};
