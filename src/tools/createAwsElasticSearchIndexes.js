/* eslint-disable no-restricted-syntax */
import moment from 'moment';
import { auditLogger, logger } from '../logger';
import {
  getClient, deleteIndex, createIndex, bulkIndex,
} from '../lib/awsElasticSearch/index';
import {
  sequelize,
} from '../models';
import { AWS_ELASTIC_SEARCH_INDEXES } from '../constants';

/*
        TTAHUB-870:
        This script should be run to create the initial
        aws Elasticsearch indexes based on the current database date.
        Running this script will wipe ALL existing indexed data and re-create it.
*/
export default async function createAwsElasticSearchIndexes() {
  try {
    // Create client.
    const client = await getClient();
    const startTotalTime = moment();

    // Delete index if exists.
    const startCleaningIndex = moment();
    await deleteIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    const finishCleaningIndex = moment();

    // Create new explicit index.
    const startCreatingIndex = moment();
    await createIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    const finishCreatingIndex = moment();

    // Get activity reports.
    const startGettingReports = moment();

    /* We need to use raw sql here otherwise we timeout and run out of memory. */
    const reportsSql = `
    -- Create AR temp table.
    SELECT
    ar."id",
    ar."context",
    ar."startDate",
    ar."endDate"
    INTO TEMP TABLE temp_ars
    FROM "ActivityReports" ar
    WHERE ar."calculatedStatus" = 'approved'
    ORDER BY ar."id" DESC;

    -- Recipient Next Steps.
    SELECT
    rns."activityReportId",
    rns."note"
    INTO TEMP TABLE temp_recipient_next_steps
    FROM "NextSteps" rns
    WHERE rns."noteType" ='RECIPIENT'
    AND rns."activityReportId" IN (SELECT id FROM temp_ars)
    GROUP BY rns."activityReportId", rns."note"
    ORDER BY rns."activityReportId";

    -- Specialist Next Steps.
    SELECT
    rns."activityReportId",
    rns."note"
    INTO TEMP TABLE temp_specialist_next_steps
    FROM "NextSteps" rns
    WHERE rns."noteType" ='SPECIALIST'
    AND rns."activityReportId" IN (SELECT id FROM temp_ars)
    GROUP BY rns."activityReportId", rns."note"
    ORDER BY rns."activityReportId";

    -- Goals.
    SELECT
    arg."activityReportId",
    arg."name"
    INTO TEMP TABLE temp_goals
    FROM "ActivityReportGoals" arg
    WHERE arg."activityReportId" IN (SELECT id FROM temp_ars)
    GROUP BY arg."activityReportId", arg."name"
    ORDER BY arg."activityReportId";

    -- Objectives.
    SELECT
    aro."activityReportId",
    aro."title",
    aro."ttaProvided"
    INTO TEMP TABLE temp_objectives
    FROM "ActivityReportObjectives" aro
    WHERE aro."activityReportId" IN (SELECT id FROM temp_ars)
    GROUP BY aro."activityReportId", aro."title", aro."ttaProvided"
    ORDER BY aro."activityReportId";`;

    // Query DB.
    let reportsToIndex;
    let recipientNextStepsToIndex;
    let specialistNextStepsToIndex;
    let goalsToIndex;
    let objectivesToIndex;
    await sequelize.transaction(async (transaction) => {
      // Create Temp Tables.
      await sequelize.query(
        reportsSql,
        { transaction },
      );

      // Reports.
      reportsToIndex = await sequelize.query(
        'SELECT * FROM temp_ars;',
        { transaction },
      );

      // Recipient Steps.
      recipientNextStepsToIndex = await sequelize.query(
        'SELECT * FROM temp_recipient_next_steps;',
        { transaction },
      );

      // Specialist Steps.
      specialistNextStepsToIndex = await sequelize.query(
        'SELECT * FROM temp_specialist_next_steps;',
        { transaction },
      );

      // Goals.
      goalsToIndex = await sequelize.query(
        'SELECT * FROM temp_goals;',
        { transaction },
      );

      // objectives.
      objectivesToIndex = await sequelize.query(
        'SELECT * FROM temp_objectives;',
        { transaction },
      );
    });

    const finishGettingReports = moment();
    if (!reportsToIndex.length) {
      logger.info('Search Index Job Info: No reports found to index.');
    }

    // Bulk add index documents.
    logger.info(`Search Index Job Info: Starting indexing of ${reportsToIndex[0].length} reports...`);

    // Build Documents Object Json.
    const startCreatingBulk = moment();
    const documents = [];
    for (let i = 0; i < reportsToIndex[0].length; i += 1) {
      const ar = reportsToIndex[0][i];
      documents.push({
        create: {
          _index: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
          _id: ar.id,
        },
      });

      // Get relevant AR records.
      const arRecipientSteps = recipientNextStepsToIndex[0].filter(
        (r) => r.activityReportId === ar.id,
      );
      const arSpecialistSteps = specialistNextStepsToIndex[0].filter(
        (s) => s.activityReportId === ar.id,
      );
      const arGoalsSteps = goalsToIndex[0].filter((g) => g.activityReportId === ar.id);
      const arObjectivesSteps = objectivesToIndex[0].filter((o) => o.activityReportId === ar.id);

      // Add to bulk update.
      documents.push({
        context: ar.context,
        startDate: ar.startDate,
        endDate: ar.endDate,
        recipientNextSteps: arRecipientSteps.map((r) => r.note),
        specialistNextSteps: arSpecialistSteps.map((s) => s.note),
        activityReportGoals: arGoalsSteps.map((arg) => arg.name),
        activityReportObjectives: arObjectivesSteps.map((aro) => aro.title),
        activityReportObjectivesTTA: arObjectivesSteps.map((aro) => aro.ttaProvided),
      });
    }
    const finishCreatingBulk = moment();

    // Bulk update.
    const startBulkImport = moment();
    await bulkIndex(documents, AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    const finishBulkImport = moment();
    logger.info(`Search Index Job Info: ...Finished indexing of ${reportsToIndex[0].length} reports`);

    const finishTotalTime = moment();

    // Log times.
    logger.info(`
    - Create AWS Elasticsearch Indexes -
    | Total Reports Indexed (#): ${reportsToIndex[0].length} |
    | Total Time: ${finishTotalTime.diff(startTotalTime) / 1000}sec |
    | Clean Index: ${finishCleaningIndex.diff(startCleaningIndex) / 1000}sec |
    | Create Index: ${finishCreatingIndex.diff(startCreatingIndex) / 1000}sec |
    | Get Reports: ${finishGettingReports.diff(startGettingReports) / 1000}sec |
    | Create Import: ${finishCreatingBulk.diff(startCreatingBulk) / 1000}sec |
    | Create Import: ${finishCreatingBulk.diff(startCreatingBulk) / 1000}sec |
    | Creating Bulk Data: ${finishBulkImport.diff(startBulkImport) / 1000}sec |`);
  } catch (error) {
    auditLogger.error(`Search Index Job Error: ${error.message}`);
  }
}
