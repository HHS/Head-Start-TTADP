/* eslint-disable no-restricted-syntax */
import { Op } from 'sequelize';
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
  ActivityReportGoal,
  ActivityReport,
  NextStep,
  ActivityReportObjective,
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
    // Query DB.
    let reportsToIndex;
    let recipientNextStepsToIndex;
    let specialistNextStepsToIndex;
    let goalsToIndex;
    let objectivesToIndex;

    await sequelize.transaction(async (transaction) => {
      // Reports.
      reportsToIndex = await ActivityReport.findAll({
        attributes: ['id', 'context', 'startDate', 'endDate'],
        where: { calculatedStatus: 'approved' },
        order: [['id', 'ASC']],
        raw: true,
        transaction,
      });

      const reportIds = reportsToIndex.map((report) => report.id);
      // Recipient Steps.
      recipientNextStepsToIndex = await NextStep.findAll({
        attributes: ['activityReportId', 'note'],
        where: {
          noteType: 'RECIPIENT',
          activityReportId: { [Op.in]: reportIds },
        },
        group: ['activityReportId', 'note'],
        order: [['activityReportId', 'ASC']],
        raw: true,
        transaction,
      });
      // Specialist Steps.
      specialistNextStepsToIndex = await NextStep.findAll({
        attributes: ['activityReportId', 'note'],
        where: {
          noteType: 'SPECIALIST',
          activityReportId: { [Op.in]: reportIds },
        },
        group: ['activityReportId', 'note'],
        order: [['activityReportId', 'ASC']],
        raw: true,
        transaction,
      });
      // Goals.
      goalsToIndex = await ActivityReportGoal.findAll({
        attributes: ['activityReportId', 'name'],
        where: {
          activityReportId: { [Op.in]: reportIds },
        },
        group: ['activityReportId', 'name'],
        order: [['activityReportId', 'ASC']],
        raw: true,
        transaction,
      });
      // objectives.
      objectivesToIndex = await ActivityReportObjective.findAll({
        attributes: ['activityReportId', 'title', 'ttaProvided'],
        where: {
          activityReportId: { [Op.in]: reportIds },
        },
        group: ['activityReportId', 'title', 'ttaProvided'],
        order: [['activityReportId', 'ASC']],
        raw: true,
        transaction,
      });
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
      const arGoalsSteps = goalsToIndex.filter((g) => g.activityReportId === ar.id);
      const arObjectivesSteps = objectivesToIndex.filter((o) => o.activityReportId === ar.id);

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
    | Create Import: ${finishCreatingBulk.diff(startCreatingBulk) / 1000}sec |
    | Creating Bulk Data: ${finishBulkImport.diff(startBulkImport) / 1000}sec |`);
  } catch (error) {
    auditLogger.error(`Search Index Job Error: ${error}`);
  }
}
