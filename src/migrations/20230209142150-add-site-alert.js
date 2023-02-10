module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
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

      await queryInterface.createTable('SiteAlerts', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Users',
            },
            key: 'id',
          },
        },
        startDate: {
          type: Sequelize.DataTypes.DATE,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DataTypes.DATE,
          allowNull: false,
        },
        title: {
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        message: {
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: Sequelize.DataTypes.ENUM(['Unpublished', 'Published']),
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        ' SELECT "ZAFRemoveAuditingOnTable"(\'SiteAlerts\');',
        { raw: true, transaction },
      );
      // Drop old audit log table
      await queryInterface.dropTable('ZALSiteAlerts', { transaction });
      await queryInterface.dropTable('SiteAlerts', { transaction });

      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction },
      );
    },
  ),
};
