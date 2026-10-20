const { prepMigration, removeTables } = require('../lib/migration');

const TTA_REQUEST_STATUSES = ['draft'];
const TTA_REQUEST_ORIGINATORS = ['Central Office', 'Recipient', 'Regional Office', 'TTA Staff'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.createTable(
        'TtaRequests',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'Users' }, key: 'id' },
          },
          lastUpdatedById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'Users' }, key: 'id' },
          },
          regionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'Regions' }, key: 'id' },
          },
          recipientId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: { tableName: 'Recipients' }, key: 'id' },
          },
          recipientAware: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
          },
          originator: {
            type: Sequelize.ENUM(TTA_REQUEST_ORIGINATORS),
            allowNull: true,
          },
          goalTemplateId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: { tableName: 'GoalTemplates' }, key: 'id' },
          },
          context: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          creatorNotes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          reviewerId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: { tableName: 'Users' }, key: 'id' },
          },
          status: {
            type: Sequelize.ENUM(TTA_REQUEST_STATUSES),
            allowNull: false,
            defaultValue: 'draft',
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        'TtaRequestGrants',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          ttaRequestId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'TtaRequests' }, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          grantId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'Grants' }, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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
      );

      await queryInterface.addIndex('TtaRequestGrants', ['ttaRequestId', 'grantId'], {
        name: 'tta_request_grants_tta_request_id_grant_id',
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
        'TtaRequestCitations',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          ttaRequestId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'TtaRequests' }, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          citation: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          findingType: {
            type: Sequelize.TEXT,
            allowNull: true,
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
      );

      await queryInterface.addIndex('TtaRequestCitations', ['ttaRequestId', 'citation'], {
        name: 'tta_request_citations_tta_request_id_citation',
        unique: true,
        transaction,
      });
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // the join tables reference TtaRequests, so they go first
      await removeTables(queryInterface, transaction, ['TtaRequestGrants', 'TtaRequestCitations']);
      await removeTables(queryInterface, transaction, ['TtaRequests']);
      await queryInterface.sequelize.query(
        `
        DROP TYPE IF EXISTS "enum_TtaRequests_status";
        DROP TYPE IF EXISTS "enum_TtaRequests_originator";
        `,
        { transaction }
      );
    }),
};
