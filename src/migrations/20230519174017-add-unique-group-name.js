module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
              set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
              set_config('audit.transactionId', NULL, TRUE) as "transactionId",
              set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
              set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        -- append the id to all groups that don't have distinct names
        UPDATE "Groups" SET "name" = "name" || "id" WHERE "name" IN (
            SELECT "name" FROM "Groups" GROUP BY ("name") HAVING COUNT(id) > 1
        );
        
        -- add unique constraint
        ALTER TABLE "Groups"
        ADD CONSTRAINT "Groups_name_key" UNIQUE (name);`,
        { transaction }
      )

      // add isUnique boolean column to the Groups table
      await queryInterface.addColumn('Groups', 'isPublic', { type: Sequelize.BOOLEAN, default: false }, { transaction })

      await queryInterface.sequelize.query(
        `
        UPDATE "Groups"
        SET "isPublic" = false;`,
        { transaction }
      )
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
              set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
              set_config('audit.transactionId', NULL, TRUE) as "transactionId",
              set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
              set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      // Disable allow null and unique.
      await queryInterface.sequelize.query(
        `ALTER TABLE "Groups"
        DROP CONSTRAINT "Groups_name_key";`,
        { transaction }
      )

      // remove isUnique boolean column to the Groups table
      await queryInterface.removeColumn('Groups', 'isPublic', { transaction })
    })
  },
}
