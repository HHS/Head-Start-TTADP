module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      // remove the managerNotes and creatorNotes from the approved reports
      return queryInterface.sequelize.query(
        `
        -- set the additional notes to empty string
      UPDATE "ActivityReports" SET "additionalNotes" = '' WHERE "calculatedStatus" = 'approved';

       -- set the manager notes to empty string
      UPDATE "ActivityReportApprovers" SET "note" = '' WHERE "activityReportId" IN (
        SELECT "id" FROM "ActivityReports" WHERE "calculatedStatus" = 'approved'
      );
      
      `,
        { transaction }
      )
    }),

  down: async () => {
    // there can be no down here
  },
}
