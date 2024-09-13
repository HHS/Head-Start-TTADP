const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(/* sql */`
        -- Indexes for the "ActivityReports" table
        -- Index on ActivityReports.calculatedStatus for filtering approved reports
        CREATE INDEX IF NOT EXISTS activity_reports_calculated_status
            ON "ActivityReports"("calculatedStatus");

        -- Index on ActivityReports.endDate for filtering by end date
        CREATE INDEX IF NOT EXISTS activity_reports_end_date
            ON "ActivityReports"("endDate");

        -- GIN index on array column ActivityReports.ttaType for array containment queries
        CREATE INDEX IF NOT EXISTS activity_reports_tta_type
            ON "ActivityReports" USING gin("ttaType");

        -- Indexes for the "Goals" table
        -- Index on goalTemplateId for FEI for faster filtering
        CREATE INDEX IF NOT EXISTS  goals_template_id_19017
            ON "Goals"("goalTemplateId")
            WHERE "goalTemplateId" = 19017;

        -- Indexes for the "Grants" table
        -- Index on recipientId and status for faster filtering
        CREATE INDEX IF NOT EXISTS grants_recipientid_status
            ON "Grants" ("recipientId", status);

        -- Index on id for filtering active grants
        CREATE INDEX IF NOT EXISTS active_grants
            ON "Grants" (id) WHERE status = 'Active';

        -- Index on Grants.status for filtering active grants
        CREATE INDEX IF NOT EXISTS grants_status
            ON "Grants"("status");

        -- Index on Grants.regionId for filtering by region
        CREATE INDEX IF NOT EXISTS grants_region_id
            ON "Grants"("regionId");

        -- Index on Grants.stateCode for filtering by state
        CREATE INDEX IF NOT EXISTS grants_state_code
            ON "Grants"("stateCode");

        -- Index on recipientId for filtering or joining with Recipients
        CREATE INDEX IF NOT EXISTS grants_recipient_id
            ON "Grants"("recipientId");

        -- Indexes for the "Recipients" table
        -- Index for filtering recipients by name
        CREATE INDEX IF NOT EXISTS recipients_name
            ON "Recipients" (name);

        -- Indexes for the "MonitoringClassSummaries" table
        -- Index on reportDeliveryDate for sorting by date
        CREATE INDEX IF NOT EXISTS monitoring_class_summaries_report_delivery_date
            ON "MonitoringClassSummaries"("reportDeliveryDate");

        -- Index on emotionalSupport for filtering based on emotional support
        CREATE INDEX IF NOT EXISTS monitoring_class_summaries_emotional_support
            ON "MonitoringClassSummaries"("emotionalSupport");

        -- Index on classroomOrganization for filtering based on classroom organization
        CREATE INDEX IF NOT EXISTS monitoring_class_summaries_classroom_organization
            ON "MonitoringClassSummaries"("classroomOrganization");

        -- Index on instructionalSupport for filtering based on instructional support
        CREATE INDEX IF NOT EXISTS monitoring_class_summaries_instructional_support
            ON "MonitoringClassSummaries"("instructionalSupport");

        -- Index on grantNumber and reportDeliveryDate for faster aggregations
        CREATE INDEX IF NOT EXISTS monitoring_class_summaries_grant_number
            ON "MonitoringClassSummaries" ("grantNumber", "reportDeliveryDate");

        -- Indexes for the "MonitoringReviewStatuses" table
        -- Index on statusId and name for filtering by status
        CREATE INDEX IF NOT EXISTS monitoring_review_statuses_status_id_name
            ON "MonitoringReviewStatuses" ("statusId", "name");

        -- Indexes for the "GroupCollaborators" table
        -- Index on groupId for fast lookups in group collaborations
        CREATE INDEX IF NOT EXISTS group_collaborators_group_id
            ON "GroupCollaborators"("groupId");

        -- Index on userId for fast filtering by userId
        CREATE INDEX IF NOT EXISTS group_collaborators_user_id
            ON "GroupCollaborators"("userId");

        -- Index for faster lookups on groupId and userId in GroupCollaborators
        CREATE INDEX IF NOT EXISTS group_collaborators_group_id_user_id
            ON "GroupCollaborators" ("groupId", "userId");

        -- Index for faster lookups on groupId, userId, and deletedAt in GroupCollaborators
        CREATE INDEX group_collaborators_group_user_deleted
            ON "GroupCollaborators"("groupId", "userId", "deletedAt");

        -- Indexes for the "Programs" table
        -- Index for faster lookups on grantId and programType in Programs
        CREATE INDEX IF NOT EXISTS programs_grantid_programtype
            ON "Programs"("grantId", "programType");
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
