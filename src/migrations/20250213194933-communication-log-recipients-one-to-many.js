const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Users_flags" ADD VALUE IF NOT EXISTS 'multirecipient_communication_log';        
     `);

      await queryInterface.createTable('CommunicationLogRecipients', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        recipientId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Recipients',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        communicationLogId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'CommunicationLogs',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });

      await queryInterface.sequelize.query(`
        INSERT INTO "CommunicationLogRecipients" ("recipientId", "communicationLogId", "createdAt", "updatedAt")
        SELECT "recipientId", id, "createdAt", "updatedAt" FROM "CommunicationLogs";
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "communication_log_recipients_communication_log_id_recipient_id";
        CREATE UNIQUE INDEX  "communication_log_recipients_communication_log_id_recipient_id_unique" ON "CommunicationLogRecipients" ("communicationLogId","recipientId");
      `, { transaction });

      await queryInterface.removeColumn('CommunicationLogs', 'recipientId', { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction, Sequelize) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.addColumn('CommunicationLogs', 'recipientId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Recipient',
          key: 'id',
        },
      }, { transaction });

      // reverse the migration
      await queryInterface.sequelize.query('UPDATE "CommunicationLogs" cl SET "recipientId" = clr."recipientId" FROM "CommunicationLogRecipient" clr WHERE cl.id = clr."communicationLogId"', { transaction });

      // remove the constraint
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "communication_log_recipients_communication_log_id_recipient_id_unique";
      `, { transaction });

      // the column can't allow null now that we've populated it
      await queryInterface.sequelize.query('ALTER TABLE "CommunicationLogs" ALTER COLUMN "recipientId" SET NOT NULL', { transaction });

      // drop the table
      await queryInterface.dropTable('CommunicationLogRecipient', { transaction });
    },
  ),
};
