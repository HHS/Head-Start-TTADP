const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.addColumn('SessionReportPilots', 'startDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('SessionReportPilots', 'endDate', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      }, { transaction });
      await queryInterface.sequelize.query(`
      UPDATE "SessionReportPilots" SET
        "startDate" = CASE
          WHEN (data->>'startDate') IS NULL OR TRIM(data->>'startDate') = '' THEN NULL
          WHEN (data->>'startDate') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (data->>'startDate')::date
          WHEN (data->>'startDate') ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN TO_DATE(data->>'startDate', 'MM/DD/YYYY')
          WHEN (data->>'startDate') ~ '^\\d{1,2}/\\d{1,2}/\\d{2}$' THEN TO_DATE(data->>'startDate', 'MM/DD/YY')
          ELSE NULL
        END,
        "endDate" = CASE
          WHEN (data->>'endDate') IS NULL OR TRIM(data->>'endDate') = '' THEN NULL
          WHEN (data->>'endDate') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (data->>'endDate')::date
          WHEN (data->>'endDate') ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN TO_DATE(data->>'endDate', 'MM/DD/YYYY')
          WHEN (data->>'endDate') ~ '^\\d{1,2}/\\d{1,2}/\\d{2}$' THEN TO_DATE(data->>'endDate', 'MM/DD/YY')
          ELSE NULL
        END
    `, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('SessionReportPilots', 'startDate', { transaction });
      await queryInterface.removeColumn('SessionReportPilots', 'endDate', { transaction });
    });
  },
};
