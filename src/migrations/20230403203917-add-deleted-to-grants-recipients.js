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

      await queryInterface.addColumn(
        'Recipients',
        'deleted',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'Grants',
        'deleted',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
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
      await queryInterface.removeColumn('Recipients', 'deleted', { transaction })
      await queryInterface.removeColumn('Grants', 'deleted', { transaction })
    })
  },
}
