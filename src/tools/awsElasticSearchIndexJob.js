/* eslint-disable no-restricted-syntax */
import { Op } from 'sequelize';
import { create } from 'lodash';
import { auditLogger, logger } from '../logger';
import { getClient, deleteIndexDocument, createIndex } from '../lib/awsElasticSearch/awsElasticSearch';
import {
  sequelize,
  Topic,
  TopicGoal,
} from '../models';
import { AWS_ELASTIC_SEARCH_INDEXES } from '../constants';

/*
    TTAHUB-870:
        This script should be run to create the initial
        aws elastic search indexes based on the current database date.
        Running this script will wipe ALL existing indexed data and re-create it.
*/
export default async function awsElasticSearchIndexJob() {
  try {
    // Create client.
    const client = await getClient();

    // Delete index if exists.
    const delRes = await deleteIndexDocument(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    if (!delRes.body.acknowledged) {
      throw new Error(`Unable to delete the index ${AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS} received the following response: ${delRes.body}`);
    }

    // Create new index.
    const createIndexRes = await createIndex(AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS, client);
    if (!createIndexRes.statusCode !== 200) {
      throw new Error(`Unable to create the index ${AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS} received the following response: ${createIndexRes.body}`);
    }

    // Get activity reports.


    // Bulk add index documents.
  } catch (error) {
    auditLogger.error(`Search Index Job Error: ${error.message}`);
  }
}
