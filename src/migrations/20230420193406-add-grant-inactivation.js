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
      const inactivationReasons = ['Replaced', 'Terminated', 'Relinquished', 'Unknown']

      await queryInterface.addColumn(
        'Grants',
        'inactivationDate',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'Grants',
        'inactivationReason',
        {
          type: Sequelize.ENUM(inactivationReasons),
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

      await queryInterface.removeColumn('Grants', 'inactivationDate', { transaction })
      await queryInterface.removeColumn('Grants', 'inactivationReason', { transaction })
      await queryInterface.sequelize.query('DROP TYPE public."enum_Grants_inactivationReason";', {
        transaction,
      })
    })
  },
}
