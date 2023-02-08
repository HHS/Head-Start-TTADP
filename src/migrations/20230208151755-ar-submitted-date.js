/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction((t) => Promise.all([
      queryInterface.addColumn(
        'ActivityReports',
        'submittedDate',
        { type: Sequelize.DataTypes.DATEONLY, allowNull: true },
        { t },
      ),
      queryInterface.sequelize.query(`
      UPDATE
      "ActivityReports" ar
        SET
            "submittedDate" = s."submittedDate"
        FROM
            (
            SELECT
            data_id "activityReportId",
            MIN(dml_timestamp) "firstSubmittedDate",
            MAX(dml_timestamp) "submittedDate"
            FROM "ZALActivityReports" za
            WHERE dml_type = 'UPDATE'
            AND new_row_data ->> 'submissionStatus' = 'submitted'
            AND old_row_data ->> 'submissionStatus' != 'submitted'
            GROUP BY 1
          ) s
        WHERE
            ar."id" = s."activityReportId";
      `, { t }),
    ]));
  },

  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.removeColumn(
    'ActivityReports',
    'submittedDate',
    { transaction },
  )),
};
