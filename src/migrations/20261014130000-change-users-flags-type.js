const { prepMigration } = require('../lib/migration');

/**
 * Converts "Users"."flags" from an array of enums to an array of strings.
 *
 * Sequelize caches enum type OIDs per process; when a database restore recreates
 * "enum_Users_flags" with a new OID, flags are returned as a raw string until the
 * app restarts. Allowed values are now validated in the User model instead.
 *
 * The "enum_Users_flags" type is intentionally kept so this (and older) migrations
 * can be rolled back.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      return queryInterface.sequelize.query(
        `
        ALTER TABLE "Users" ALTER COLUMN "flags" DROP DEFAULT;
        ALTER TABLE "Users"
        ALTER COLUMN "flags" TYPE VARCHAR(255)[] USING ("flags"::text[]);
        ALTER TABLE "Users" ALTER COLUMN "flags" SET DEFAULT '{}'::character varying(255)[];
      `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Flags added after this migration only exist in constants, not in the enum,
      // so drop any value the enum can't hold before casting back.
      return queryInterface.sequelize.query(
        `
        UPDATE "Users"
        SET "flags" = ARRAY(
          SELECT f FROM unnest("flags") AS f
          WHERE f IN (SELECT unnest(enum_range(NULL::"enum_Users_flags"))::text)
        );

        ALTER TABLE "Users" ALTER COLUMN "flags" DROP DEFAULT;
        ALTER TABLE "Users"
        ALTER COLUMN "flags" TYPE "enum_Users_flags"[] USING ("flags"::text[]::"enum_Users_flags"[]);
        ALTER TABLE "Users" ALTER COLUMN "flags" SET DEFAULT ARRAY[]::"enum_Users_flags"[];
      `,
        { transaction }
      );
    });
  },
};
