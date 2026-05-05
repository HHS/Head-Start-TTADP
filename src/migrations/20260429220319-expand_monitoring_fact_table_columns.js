const fs = require('fs');
const path = require('path');

const compiledUpdateMonitoringFactTablesPath = path.resolve(
  __dirname,
  '../tools/updateMonitoringFactTables.js'
);

if (!fs.existsSync(compiledUpdateMonitoringFactTablesPath)) {
  require('tsx/cjs'); // eslint-disable-line global-require, import/no-unresolved
}

const updateMonitoringFactTables = require('../tools/updateMonitoringFactTables').default;

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'DeliveredReviews',
        'class_es',
        {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'DeliveredReviews',
        'class_co',
        {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'DeliveredReviews',
        'class_is',
        {
          type: Sequelize.DECIMAL(5, 4),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'Citations',
        'standard_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'DeliveredReviewCitations',
        'determination',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'DeliveredReviewCitations',
        'latest_review_start',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'DeliveredReviewCitations',
        'latest_review_end',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );
    });

    await updateMonitoringFactTables();
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "DeliveredReviews" DROP COLUMN IF EXISTS class_es',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "DeliveredReviews" DROP COLUMN IF EXISTS class_co',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "DeliveredReviews" DROP COLUMN IF EXISTS class_is',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "Citations" DROP COLUMN IF EXISTS standard_id',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "DeliveredReviewCitations" DROP COLUMN IF EXISTS determination',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "DeliveredReviewCitations" DROP COLUMN IF EXISTS latest_review_start',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "DeliveredReviewCitations" DROP COLUMN IF EXISTS latest_review_end',
        { transaction }
      );
    });
  },
};
