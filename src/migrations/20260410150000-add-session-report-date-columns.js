module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('SessionReportPilots', 'startDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('SessionReportPilots', 'endDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
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
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('SessionReportPilots', 'startDate');
    await queryInterface.removeColumn('SessionReportPilots', 'endDate');
  },
};
