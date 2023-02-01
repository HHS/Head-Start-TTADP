/* eslint-disable no-restricted-syntax */
import moment from 'moment';
import { auditLogger, logger } from '../logger';
import {
  getClient,
  deleteIndex,
  createIndex,
  bulkIndex,
} from '../lib/awsElasticSearch/index';
import {
  sequelize,
  ActivityReport,
} from '../models';
import { AWS_ELASTIC_SEARCH_INDEXES } from '../constants';
import { collectModelData } from '../lib/awsElasticSearch/datacollector';
import { formatModelForAwsElasticsearch } from '../lib/awsElasticSearch/modelMapper';

async function getDataForReports(reportsToIndex, data) {
  const {
    recipientNextStepsToIndex,
    specialistNextStepsToIndex,
    goalsToIndex,
    objectivesToIndex,
    objectiveResourceLinks,
  } = data;
  const documents = [];
  for (let i = 0; i < reportsToIndex.length; i += 1) {
    const ar = reportsToIndex[i];
    documents.push({
      create: {
        _index: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        _id: ar.id,
      },
    });

    // Get relevant AR records.
    const arRecipientSteps = recipientNextStepsToIndex.filter(
      (r) => r.activityReportId === ar.id,
    );
    const arSpecialistSteps = specialistNextStepsToIndex.filter(
      (s) => s.activityReportId === ar.id,
    );
    const arGoals = goalsToIndex.filter((g) => g.activityReportId === ar.id);
    const arObjectives = objectivesToIndex.filter((o) => o.activityReportId === ar.id);
    const arObjectivesResources = objectiveResourceLinks.filter((o) => o['activityReportObjective.activityReportId'] === ar.id);

    // Map to Model.
    const formattedData = formatModelForAwsElasticsearch(
      AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
      {
        ar,
        recipientNextStepsToIndex: arRecipientSteps,
        specialistNextStepsToIndex: arSpecialistSteps,
        goalsToIndex: arGoals,
        objectivesToIndex: arObjectives,
        objectiveResourceLinks: arObjectivesResources,
      },
    );

    // Add to bulk update.
    documents.push(formattedData);
  }

  // Make sure we resolve all async promises.
  return Promise.all(documents);
}
/*
        TTAHUB-870:
        This script should be run to create the initial
        aws Elasticsearch indexes based on the current database date.
        Running this script will wipe ALL existing indexed data and re-create it.
*/
export default async function createAwsElasticSearchIndexes(batchSize = 100) {
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
    // Query DB.
    let reportsToIndex;
    let data;

    await sequelize.transaction(async (transaction) => {
      // Reports.
      reportsToIndex = await ActivityReport.findAll({
        where: { calculatedStatus: 'approved' },
        order: [['id', 'ASC']],
        raw: true,
        transaction,
      });

      if (!reportsToIndex.length) {
        return;
      }

      const reportIds = reportsToIndex.map((report) => report.id);
      data = await collectModelData(
        reportIds,
        AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        sequelize,
      );
    });

    const finishGettingReports = moment();
    if (!reportsToIndex.length) {
      logger.info('Search Index Job Info: No reports found to index.');
      return;
    }
    // Bulk add index documents.
    logger.info(`Search Index Job Info: Starting indexing of ${reportsToIndex.length} reports...`);

    // Build Documents Object Json.
    const startCreatingBulk = moment();
    logger.info('Search Index Job Info: Gathering and converting model data...');
    // Convert all reports to documents.
    const documents = await getDataForReports(reportsToIndex, data);
    logger.info('Search Index Job Info: ...Gathering and converting model data completed');
    const finishCreatingBulk = moment();

    // Bulk update.
    const startBulkImport = moment();
    logger.info('Search Index Job Info: Starting bulk import...');
    let totalCount = 0;

    // We need to loop this in increments of 100 (each item has two entries).
    const documentCount = documents.length / 2; // Each items has two entries.
    const wholeIterations = Math.floor(documentCount / batchSize);
    const iterations = documentCount % batchSize > 0
      ? wholeIterations + 1 // Add an extra iteration.
      : wholeIterations;

    // Bulk import.
    for (let i = 1; i <= iterations; i += 1) {
      // If we are on the last loop iteration get from 0-remaining.
      const addToProcess = documents.splice(0, i === iterations ? documents.length : batchSize * 2);
      totalCount += addToProcess.length;
      // Add to bulk import batch.
      // eslint-disable-next-line no-await-in-loop
      await bulkIndex(
        addToProcess,
        AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        client,
      );
      logger.info(`- Bulk Group #${i}: Importing ${addToProcess.length} reports`);
    }

    logger.info(`Search Index Job Info: ...Bulk import completed for ${totalCount / 2} reports in ${iterations} iterations of ${batchSize} each`);
    const finishBulkImport = moment();

    logger.info(`Search Index Job Info: ...Finished indexing of ${reportsToIndex.length} reports`);

    const finishTotalTime = moment();

    // Log times.
    logger.info(`
    - Create AWS Elasticsearch Indexes -
    | Total Reports Indexed (#): ${reportsToIndex.length} |
    | Total Time: ${finishTotalTime.diff(startTotalTime) / 1000}sec |
    | Clean Index: ${finishCleaningIndex.diff(startCleaningIndex) / 1000}sec |
    | Create Index: ${finishCreatingIndex.diff(startCreatingIndex) / 1000}sec |
    | Get Reports: ${finishGettingReports.diff(startGettingReports) / 1000}sec |
    | Create Import: ${finishCreatingBulk.diff(startCreatingBulk) / 1000}sec |
    | Creating Bulk Data: ${finishBulkImport.diff(startBulkImport) / 1000}sec |`);
  } catch (error) {
    auditLogger.error(`Search Index Job Error: ${error}`);
  }
}
