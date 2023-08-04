/* eslint-disable max-len */
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

      await queryInterface.createTable('Courses', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        name: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        inactiveDate: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      });
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
      await Promise.all(['Courses'].map(async (table) => {
        await queryInterface.sequelize.query(
          ` SELECT "ZAFRemoveAuditingOnTable"('${table}');`,
          { raw: true, transaction },
        );
        // Drop old audit log table
        await queryInterface.dropTable(`ZAL${table}`, { transaction });
        await queryInterface.dropTable(table, { transaction });
      }));
      await queryInterface.sequelize.query(
        `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
        { transaction },
      );
    },
  ),
};
