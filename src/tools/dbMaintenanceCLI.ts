import { auditLogger } from '../logger';
import { sequelize } from '../models';

const OLD_THRESHOLD = 365; // days

// List of tables to check for old records
const tables = [
  'ZALActivityRecipients',
  'ZALActivityReportApprovers',
  'ZALActivityReportCollaborators',
  'ZALActivityReportFiles',
  'ZALActivityReportGoalFieldResponses',
  'ZALActivityReportGoalResources',
  'ZALActivityReportGoals',
  'ZALActivityReportObjectiveCitations',
  'ZALActivityReportObjectiveCourses',
  'ZALActivityReportObjectiveFiles',
  'ZALActivityReportObjectiveResources',
  'ZALActivityReportObjectiveTopics',
  'ZALActivityReportObjectives',
  'ZALActivityReportResources',
  'ZALActivityReports',
  'ZALCollabReportActivityStates',
  'ZALCollabReportApprovers',
  'ZALCollabReportDataUsed',
  'ZALCollabReportGoals',
  'ZALCollabReportReasons',
  'ZALCollabReportSpecialists',
  'ZALCollabReportSteps',
  'ZALCollabReports',
  'ZALCollaboratorRoles',
  'ZALCollaboratorTypes',
  'ZALCommunicationLogFiles',
  'ZALCommunicationLogRecipients',
  'ZALCommunicationLogs',
  'ZALCourses',
  'ZALEventReportPilotNationalCenterUsers',
  'ZALEventReportPilots',
  'ZALFiles',
  'ZALGoalCollaborators',
  'ZALGoalFieldResponses',
  'ZALGoalResources',
  'ZALGoalStatusChanges',
  'ZALGoalTemplateFieldPrompts',
  'ZALGoalTemplateObjectiveTemplates',
  'ZALGoalTemplateResources',
  'ZALGoalTemplates',
  'ZALGoals',
  'ZALGrantNumberLinks',
  'ZALGrantReplacementTypes',
  'ZALGrantReplacements',
  'ZALGrants',
  'ZALGroupCollaborators',
  'ZALGroupGrants',
  'ZALGroups',
  'ZALImportDataFiles',
  'ZALImportFiles',
  'ZALImports',
  'ZALMailerLogs',
  'ZALMaintenanceLogs',
  'ZALMonitoringClassSummaries',
  'ZALMonitoringFindingGrants',
  'ZALMonitoringFindingHistories',
  'ZALMonitoringFindingHistoryStatusLinks',
  'ZALMonitoringFindingHistoryStatuses',
  'ZALMonitoringFindingLinks',
  'ZALMonitoringFindingStandards',
  'ZALMonitoringFindingStatusLinks',
  'ZALMonitoringFindingStatuses',
  'ZALMonitoringFindings',
  'ZALMonitoringGranteeLinks',
  'ZALMonitoringReviewGrantees',
  'ZALMonitoringReviewLinks',
  'ZALMonitoringReviewStatusLinks',
  'ZALMonitoringReviewStatuses',
  'ZALMonitoringReviews',
  'ZALMonitoringStandardLinks',
  'ZALMonitoringStandards',
  'ZALNationalCenterUsers',
  'ZALNationalCenters',
  'ZALNextStepResources',
  'ZALNextSteps',
  'ZALObjectiveCollaborators',
  'ZALObjectiveTemplates',
  'ZALObjectives',
  'ZALOtherEntities',
  'ZALPermissions',
  'ZALProgramPersonnel',
  'ZALPrograms',
  'ZALRecipients',
  'ZALRegions',
  'ZALResources',
  'ZALRoleTopics',
  'ZALRoles',
  'ZALScopes',
  'ZALSessionReportPilotFiles',
  'ZALSessionReportPilotGoalTemplates',
  'ZALSessionReportPilotGrants',
  'ZALSessionReportPilotSupportingAttachments',
  'ZALSessionReportPilotTrainers',
  'ZALSessionReportPilots',
  'ZALSiteAlerts',
  'ZALTopics',
  'ZALUserRoles',
  'ZALUserSettingOverrides',
  'ZALUserSettings',
  'ZALUserValidationStatus',
  'ZALUsers',
  'ZALValidFor',
  'ZALZADescriptor',
  'ZALZAFilter',
];

async function logOldRecordsCount() {
  try {
    const results = await Promise.allSettled(
      tables.map(async (table) => {
        const [queryResults] = await sequelize.query(`SELECT COUNT(*) AS count FROM "${table}" WHERE "dml_timestamp" < NOW() - INTERVAL '${OLD_THRESHOLD} days';`);
        const count = queryResults[0]?.count || 0;
        return { table, count };
      }),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        auditLogger.info(`Table: ${result.value.table}, Records older than ${OLD_THRESHOLD} days: ${result.value.count}`);
      } else {
        const table = tables[index];
        const message = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
        auditLogger.error(`Error querying table ${table}: ${message}`);
        process.exitCode = 1;
      }
    });
  } catch (e) {
    auditLogger.error(`Error running db maintenance: ${e.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  logOldRecordsCount();
}

export default logOldRecordsCount;
