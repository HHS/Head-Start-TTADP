const FLAGS = ['grantee_record_page'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    const loggedUser = '0';
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

    await queryInterface.sequelize.query(
      `
        -- remove references to deprecated values
        UPDATE "Users"
                  SET "flags" = array_remove("flags", 'recipient_goals_objectives')
        WHERE 'recipient_goals_objectives' = ANY("flags");

        -- rename the existing type
        ALTER TYPE "enum_Users_flags" RENAME TO "enum_Users_flags_old";

        -- create the new type using FLAGS:
        CREATE TYPE "enum_Users_flags" AS ENUM('${FLAGS.join("', '")}');

        -- update the columns to use the new type
        ALTER TABLE "Users" ALTER COLUMN "flags" set default null;
        ALTER TABLE "Users" ALTER COLUMN "flags" TYPE "enum_Users_flags"[] USING "flags"::text[]::"enum_Users_flags"[];
        ALTER TABLE "Users" ALTER COLUMN "flags" set default ARRAY[]::"enum_Users_flags"[];

        -- remove the old type
        DROP TYPE "enum_Users_flags_old";
      `,
      { transaction },
    );
  }),

  // eslint-disable-next-line no-unused-vars
  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
  }),
};
