module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
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
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.createTable('ZALJobs', {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.BIGINT,
            autoIncrement: true,
          },
          command_tag: {
            allowNull: true,
            default: null,
            type: Sequelize.STRING,
          },
          object_type: {
            allowNull: true,
            default: null,
            type: Sequelize.STRING,
          },
          schema_name: {
            allowNull: true,
            default: null,
            type: Sequelize.STRING,
          },
          object_identity: {
            allowNull: true,
            default: null,
            type: Sequelize.STRING,
          },
          exit_status: {
            allowNull: true,
            default: null,
            type: Sequelize.STRING,
          },
          timestamp: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: null,
          },
          txid: {
            type: Sequelize.UUID,
            allowNull: false,
            validate: { isUUID: 'all' },
          },
          session_sig: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: null,
          },
          descriptor_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
          },
        }, {
          transaction,
          createdAt: false,
          updatedAt: false,
        });

        await queryInterface.sequelize.query(
          `SELECT
            "ZAFCreateALNoUpdate"('Jobs'),
            "ZAFCreateALNoDelete"('Jobs'),
            "ZAFCreateALNoTruncate"('Jobs');`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
