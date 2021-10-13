import { REPORT_STATUSES } from '../constants';
import { auditLogger } from '../logger';
import { ActivityReport, ActivityReportApprover, sequelize } from '../models';

const { QueryTypes } = require('sequelize');

async function createApprovers(approvers) {
  try {
    auditLogger.info(`Creating {${approvers.length || 0}} approver record(s)...`);
    const createdApprovers = await ActivityReportApprover.bulkCreate(
      approvers,
      {
        individualHooks: false,
        hooks: false,
      },
    );
    auditLogger.info(`...Created {${createdApprovers.length || 0}} approver record(s).`);
  } catch (error) {
    auditLogger.error(`Script encountered error ${error}`);
  }
}

async function updateReportStatuses(oldStatus) {
  // Overall, cumulative status is now held in `calculatedStatus` col
  const newValues = { calculatedStatus: oldStatus };
  // After submitting, terminal status for `submissionStatus`` is SUBMITTED
  if (oldStatus === REPORT_STATUSES.APPROVED || oldStatus === REPORT_STATUSES.NEEDS_ACTION) {
    newValues.submissionStatus = REPORT_STATUSES.SUBMITTED;
  }

  try {
    auditLogger.info(`Updating ${oldStatus} report(s)...`);
    const updatedReports = await ActivityReport.update(
      newValues, {
        where: {
          submissionStatus: oldStatus,
          calculatedStatus: null,
        },
        hooks: false,
        silent: true,
        validate: false,
        individualHooks: false,
      },
    );
    auditLogger.info(`...Updated {${updatedReports[0] || 0}} ${oldStatus} report(s).`);
  } catch (error) {
    auditLogger.error(`Script encountered error ${error}`);
  }
}

const transitionToMultApprovers = async () => {
  try {
    // Create approvers for: submitted, draft, and deleted reports.
    // - These are done separately from approved, and needs_action reports, because the
    // status of the approver entry is going to be null
    const notReviewedApproverEntries = await sequelize.query(`SELECT "ActivityReports"."id" as "activityReportId",
          "oldApprovingManagerId" as "userId"
        FROM "ActivityReports"
        LEFT JOIN "ActivityReportApprovers"
        ON "ActivityReports"."id" = "ActivityReportApprovers"."activityReportId"
        WHERE "ActivityReportApprovers"."activityReportId" IS NULL
          AND ("submissionStatus" IN (:status) OR "calculatedStatus" IN (:status))
          AND "submissionStatus" NOT IN (:excludeStatus)
          AND ("calculatedStatus" IS NULL OR "calculatedStatus" NOT IN (:excludeStatus))
          AND "oldApprovingManagerId" IS NOT NULL`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        status: [REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.DRAFT, REPORT_STATUSES.DELETED],
        excludeStatus: [REPORT_STATUSES.NEEDS_ACTION, REPORT_STATUSES.APPROVED],
      },
    });
    if (notReviewedApproverEntries.length > 0) {
      await createApprovers(notReviewedApproverEntries);
    }

    // Create approvers for: approved, and needs_action reports where submissionStatus
    // holds our status
    const reviewedApproverEntries = await sequelize.query(`SELECT "ActivityReports"."id" as "activityReportId",
        "oldApprovingManagerId" as "userId",
        "submissionStatus" as "status",
        "oldManagerNotes" as "note"
      FROM "ActivityReports"
      LEFT JOIN "ActivityReportApprovers"
      ON "ActivityReports"."id" = "ActivityReportApprovers"."activityReportId"
      WHERE "ActivityReportApprovers"."activityReportId" IS NULL
        AND "submissionStatus" IN(:status)
        AND "oldApprovingManagerId" IS NOT NULL`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        status: [REPORT_STATUSES.APPROVED, REPORT_STATUSES.NEEDS_ACTION],
      },
    });
    if (reviewedApproverEntries.length > 0) {
      await createApprovers(reviewedApproverEntries);
    }

    // Create approvers for: approved, and needs_action reports where calculatedStatus
    // holds our status. This is done to clean up reports where the calculatedStatus col
    // was updated but the approver record was not created
    const reviewedAndCalculatedApproverEntries = await sequelize.query(`SELECT "ActivityReports"."id" as "activityReportId",
        "oldApprovingManagerId" as "userId",
        "calculatedStatus" as "status",
        "oldManagerNotes" as "note"
      FROM "ActivityReports"
      LEFT JOIN "ActivityReportApprovers"
      ON "ActivityReports"."id" = "ActivityReportApprovers"."activityReportId"
      WHERE "ActivityReportApprovers"."activityReportId" IS NULL
        AND "calculatedStatus" IN(:status)
        AND "oldApprovingManagerId" IS NOT NULL`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        status: [REPORT_STATUSES.APPROVED, REPORT_STATUSES.NEEDS_ACTION],
      },
    });
    if (reviewedAndCalculatedApproverEntries.length > 0) {
      await createApprovers(reviewedAndCalculatedApproverEntries);
    }

    // Update report calculatedStatus and submissionStatus
    await updateReportStatuses(REPORT_STATUSES.APPROVED);
    await updateReportStatuses(REPORT_STATUSES.NEEDS_ACTION);
    await updateReportStatuses(REPORT_STATUSES.SUBMITTED);
    await updateReportStatuses(REPORT_STATUSES.DRAFT);
    await updateReportStatuses(REPORT_STATUSES.DELETED);
  } catch (error) {
    auditLogger.error(`Script encountered error ${error}`);
  }
};

export default transitionToMultApprovers;
