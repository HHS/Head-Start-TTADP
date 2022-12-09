/* eslint-disable no-restricted-syntax */
import { Op } from 'sequelize';
import moment from 'moment';
import { auditLogger, logger } from '../logger';
import {
  getClient, deleteIndex, createIndex, bulkIndex,
} from '../lib/awsElasticSearch/awsElasticSearch';
import {
  ActivityReport,
  NextStep,
  ActivityReportObjective,
  Objective,
  Goal,
} from '../models';
import { AWS_ELASTIC_SEARCH_INDEXES, REPORT_STATUSES } from '../constants';

/*
        TTAHUB-870:
        This script should be run to create the initial
        aws elastic search indexes based on the current database date.
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
    const reportsToIndex = await ActivityReport.findAll({
      where: {
        calculatedStatus: REPORT_STATUSES.APPROVED,
        // id: 21749,
        //id: 7574,
      },
      include: [
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          attributes: ['ttaProvided'],
          /*include: [{
            model: Objective,
            as: 'objective',
            include: [{
              model: Goal,
              as: 'goal',
            },
            ],
            attributes: ['id', 'title', 'status'],
          },
          ],*/
        },
        {
          model: Goal,
          as: 'goals',
          attributes: ['id', 'name'],
        },
        /*{
          model: Objective,
          as: 'objectives',
          attributes: ['id', 'title'],
        },*/
        {
          model: NextStep,
          where: {
            noteType: {
              [Op.eq]: 'SPECIALIST',
            },
          },
          attributes: ['note', 'id'],
          as: 'specialistNextSteps',
          separate: true,
          required: false,
        },
        {
          model: NextStep,
          where: {
            noteType: {
              [Op.eq]: 'RECIPIENT',
            },
          },
          attributes: ['note', 'id'],
          as: 'recipientNextSteps',
          separate: true,
          required: false,
        },
      ],
    });
    const finishGettingReports = moment();
    if (!reportsToIndex.length) {
      logger.info('Search Index Job Info: No reports found to index.');
    }

    //console.log('\n\n\nReports to Index LENGTH: ', reportsToIndex[0].objectives.length);
    //console.log('\n\n\nReports to OBJ: ', reportsToIndex[0].objectives);
    //console.log('\n\n\nReports to Index: ', reportsToIndex[0].activityReportObjectives[0].objective.goal);

    // Bulk add index documents.
    logger.info(`Search Index Job Info: Starting indexing of ${reportsToIndex.length} reports...`);
    const startCreatingBulk = moment();
    // Build Documents Object Json.
    /*
    const documents = [];
    for (let i = 0; i < reportsToIndex.length; i += 1) {
      const ar = reportsToIndex[i];
      documents.push({
        create: {
          _index: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
          _id: ar.id,
        },
      });
      documents.push({
        context: ar.context,
        startDate: ar.startDate,
        endDate: ar.endDate,
        specialistNextSteps: [...new Set(ar.specialistNextSteps.map((s) => s.note))],
        recipientNextSteps: [...new Set(ar.recipientNextSteps.map((r) => r.note))],
        activityReportObjectives: [
          ...new Set(ar.activityReportObjectives.map((aro) => aro.ttaProvided)),
        ],
        goals: [...new Set(ar.goals.map((g) => g.name))],
        //objectives: [...new Set(ar.objectives.map((o) => o.title))],
      });
    }*/
    const finishCreatingBulk = moment();
    //console.log('\n\n\n-------- Created: ', documents);

    // Bulk update.
    const startBulkImport = moment();
    /*
    await bulkIndex(documents, AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    */
    const finishBulkImport = moment();
    logger.info(`Search Index Job Info: ...Finished indexing of ${reportsToIndex.length} reports`);

    const finishTotalTime = moment();

    logger.info(`
    Times:
    | Total Time: ${finishTotalTime.diff(startTotalTime) / 1000}sec |
    | Clean Index: ${finishCleaningIndex.diff(startCleaningIndex) / 1000}sec |
    | Create Index: ${finishCreatingIndex.diff(startCreatingIndex) / 1000}sec |
    | Get Reports: ${finishGettingReports.diff(startGettingReports) / 1000}sec |
    | Create Import: ${finishCreatingBulk.diff(startCreatingBulk) / 1000}sec |
    | Create Import: ${finishCreatingBulk.diff(startCreatingBulk) / 1000}sc |
    | Creating Bulk Data: ${finishBulkImport.diff(startBulkImport) / 1000}sec |`);
  } catch (error) {
    auditLogger.error(`Search Index Job Error: ${error.message}`);
  }
}
