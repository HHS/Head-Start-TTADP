const { prepMigration, removeTables } = require('../lib/migration');

/**
 * Records each recipient/monitoring report combination the Hub detected as newly delivered
 * after a monitoring fact table refresh. `createdAt` is when the Hub detected the delivery,
 * which can be later than the report's official delivery date. Used to send at most one
 * immediate notification per combination and to build the monitoring digest (TTAHUB-6062).
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'MonitoringReportDeliveries',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          deliveredReviewId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'DeliveredReviews',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          recipientId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Recipients',
              key: 'id',
            },
          },
          regionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Regions',
              key: 'id',
            },
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'MonitoringReportDeliveries',
        ['deliveredReviewId', 'recipientId'],
        {
          unique: true,
          transaction,
        }
      );

      // the digest looks up deliveries by region within a time window
      await queryInterface.addIndex('MonitoringReportDeliveries', ['regionId', 'createdAt'], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await removeTables(queryInterface, transaction, ['MonitoringReportDeliveries']);
    });
  },
};
