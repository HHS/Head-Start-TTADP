/* eslint-disable no-restricted-syntax */
import { Op } from 'sequelize';
import { auditLogger, logger } from '../logger';
import {
  getClient, deleteIndex, createIndex, bulkIndex,
} from '../lib/awsElasticSearch/awsElasticSearch';
import {
  sequelize,
  ActivityReport,
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

    // Delete index if exists.
    await deleteIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);

    // Create new explicit index.
    await createIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);

    // Get activity reports.
    const reportsToIndex = await ActivityReport.findAll({
      where: {
        calculatedStatus: REPORT_STATUSES.APPROVED,
      },
    });

    if (!reportsToIndex.length) {
      logger.info('Search Index Job Info: No reports found to index.');
    }

    // Bulk add index documents.
    logger.info(`Search Index Job Info: Starting indexing of ${reportsToIndex.length} reports...`);

    // Build Documents Object Json.
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
      });
    }

    //console.log('\n\n\n-------- Created: ', documents);

    // Bulk update.
    await bulkIndex(documents, AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);

    logger.info(`Search Index Job Info: ...Finished indexing of ${reportsToIndex.length} reports`);
  } catch (error) {
    auditLogger.error(`Search Index Job Error: ${error.message}`);
  }
}
