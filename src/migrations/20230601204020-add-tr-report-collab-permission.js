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

      // Training collab scope
      await queryInterface.bulkInsert(
        'Scopes',
        [
          {
            id: 9,
            name: 'COLLABORATOR_TRAINING_REPORTS',
            description: 'Can collaborate on training reports in the region',
          },
        ],
        {
          ignoreDuplicates: true,
        },
        { transaction }
      )

      // add an "imported" column to EventReportPilots
      await queryInterface.addColumn(
        'EventReportPilots',
        'imported',
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
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
      await queryInterface.sequelize.query('DELETE FROM "Permissions" WHERE "scopeId" = 9;', {
        transaction,
      })
      await queryInterface.sequelize.query('DELETE FROM "Scopes" WHERE id = 9;', { transaction })

      // remove the "imported" column from EventReportPilots
      await queryInterface.removeColumn('EventReportPilots', 'imported', { transaction })
    })
  },
}
