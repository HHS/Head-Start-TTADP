/* eslint-disable max-len */

const ACTIONS = [
  'collaboratorAssigned',
  'changesRequested',
  'approverAssigned',
  'reportApproved',
  'collaboratorDigest',
  'changesRequestedDigest',
  'approverAssignedDigest',
  'reportApprovedDigest',
];

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
      // Disable audit logging
      await queryInterface.sequelize.query(
        `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
        { transaction },
      );
      await queryInterface.createTable('MailerLogs', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        jobId: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        emailTo: {
          allowNull: false,
          type: Sequelize.ARRAY(Sequelize.STRING),
        },
        action: {
          allowNull: false,
          type: Sequelize.DataTypes.ENUM(ACTIONS),
        },
        subject: {
          allowNull: false,
          type: Sequelize.STRING,
        },
        activityReports: {
          allowNull: false,
          type: Sequelize.ARRAY(Sequelize.INTEGER),
        },
        success: {
          allowNull: true,
          type: Sequelize.BOOLEAN,
        },
        result: {
          allowNull: true,
          type: Sequelize.JSON,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      });
      // Enable audit logging
      await queryInterface.sequelize.query(
        `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
        { transaction },
      );
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
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
      // Disable audit logging
      await queryInterface.sequelize.query(
        `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
        { transaction },
      );
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS public."ZALNoTruncateFMailerLogs"() CASCADE;');
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS public."ZALNoUpdateFMailerLogs"() CASCADE;');
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS public."ZALNoDeleteFMailerLogs"() CASCADE;');

      await queryInterface.dropTable(
        'MailerLogs',
        { transaction },
      );
      await queryInterface.sequelize.query('DROP TYPE public."enum_MailerLogs_action";', { transaction });
      // Enable audit logging
      await queryInterface.sequelize.query(
        `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
        { transaction },
      );
    },
  ),
};
