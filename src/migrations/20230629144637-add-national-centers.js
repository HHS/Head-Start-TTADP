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

      await queryInterface.createTable(
        'NationalCenters',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.BIGINT,
          },
          name: {
            allowNull: false,
            type: Sequelize.TEXT,
            unique: true,
          },
          mapsTo: {
            type: Sequelize.INTEGER,
            allowNull: true,
            default: null,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'NationalCenters',
              },
              key: 'id',
            },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      )

      const centerNames = ['DTL', 'HBHS', 'PFCE', 'PFMO']

      await queryInterface.bulkInsert(
        'NationalCenters',
        centerNames.map((name) => ({
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
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

      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction }
      )

      await queryInterface.sequelize.query(' SELECT "ZAFRemoveAuditingOnTable"(\'NationalCenters\');', { raw: true, transaction })
      // Drop old audit log table
      await queryInterface.dropTable('ZALNationalCenters', { transaction })
      await queryInterface.dropTable('NationalCenters', { transaction })

      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction }
      )
    })
  },
}
