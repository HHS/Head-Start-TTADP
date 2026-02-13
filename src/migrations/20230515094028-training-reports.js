/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
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

      // Training scopes.
      queryInterface.bulkInsert(
        'Scopes',
        [
          {
            id: 7,
            name: 'READ_WRITE_TRAINING_REPORTS',
            description: 'Can view and create/edit training reports in the region',
          },
          {
            id: 8,
            name: 'READ_TRAINING_REPORTS',
            description: 'Can view training reports in the region',
          },
        ],
        {
          ignoreDuplicates: true,
        },
        { transaction }
      )

      // add new training report feature flag.
      await queryInterface.sequelize.query(
        `
        DO $$ BEGIN
        ALTER TYPE "enum_Users_flags" ADD VALUE 'training_reports';
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;
  `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
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
      await queryInterface.sequelize.query('DELETE FROM "Permissions" WHERE "scopeId" IN (7, 8);', {
        transaction,
      })
      await queryInterface.sequelize.query('DELETE FROM "Scopes" WHERE id IN (7, 8);', {
        transaction,
      })
    })
  },
}
