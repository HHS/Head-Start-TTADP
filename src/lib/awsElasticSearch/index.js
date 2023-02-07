/* eslint-disable dot-notation */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import { Client, Connection } from '@opensearch-project/opensearch';
import aws4 from 'aws4';
import { auditLogger, logger } from '../../logger';
import { wildCardQuery, matchPhraseQuery } from './queryGenerator';

/*
  Primary Docs:
  https://github.com/opensearch-project/opensearch-js/blob/HEAD/USER_GUIDE.md
  https://opensearch.org/docs/latest/api-reference/index-apis/create-index/
*/

const generateEsConfig = () => {
  // Pull from VCAP env variables (cloud.gov)
  if (process.env.VCAP_SERVICES) {
    const {
      'aws-elasticsearch': [{
        credentials: {
          uri,
          access_key,
          secret_key,
        },
      }],
    } = JSON.parse(process.env.VCAP_SERVICES);

    return {
      uri,
      access_key,
      secret_key,
    };
  }

  // Return docker image credentials.
  return {
    uri: process.env.AWS_ELASTICSEARCH_ENDPOINT,
    access_key: process.env.AWS_ELASTICSEARCH_ACCESS_KEY,
    secret_key: process.env.AWS_ELASTICSEARCH_SECRET_KEY,
  };
};

const {
  uri,
  access_key,
  secret_key,
} = generateEsConfig();

const createAwsConnector = (credentials, region) => {
  class AmazonConnection extends Connection {
    buildRequestObject(params) {
      const request = super.buildRequestObject(params);
      request.service = 'es';
      request.region = region;
      request.headers = request.headers || {};
      request.headers.host = request.hostname;

      return aws4.sign(request, credentials);
    }
  }
  return {
    Connection: AmazonConnection,
  };
};

const getClient = async () => new Client({
  ...createAwsConnector(
    {
      accessKeyId: access_key,
      secretAccessKey: secret_key,
    },
    'us-gov-west-1',
  ),
  node: uri,
});
/*
  Create an index that can have searchable documents assigned.
*/
const createIndex = async (indexName, passedClient) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Create index.
    const res = await client.indices.create({
      index: indexName,
    });

    logger.info(`AWS OpenSearch: Successfully created index ${indexName}`);
    return res;
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to create index '${indexName}': ${error.message}`);
    throw error;
  }
};
/*
  Assign a searchable document to an index.
*/
const addIndexDocument = async (job) => {
  const {
    indexName, id, document, passedClient,
  } = job.data;
  let res;
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Add a document to an index.
    res = await client.index({
      index: indexName,
      id,
      body: document,
      refresh: true, // triggers manual refresh.
    });
    logger.info(`AWS OpenSearch: Successfully added document ${id} to index ${indexName}`);

    return { data: job.data, status: res.statusCode, res };
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to add document to index '${indexName}': ${error.message}`);
    return { data: job.data, status: res.statusCode, res };
  }
};
/*
  Bulk document index.
  Documents should be in following structure:
  { "create": { "_index": "movies", "_id": "tt1392214" } }
  { "title": "Prisoners", "year": 2013 }
*/
const bulkIndex = async (documents, indexName, passedClient) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Add a document to an index.
    const res = await client.bulk({
      body: documents,
      refresh: true, // triggers manual refresh.
    });
    logger.info(`AWS OpenSearch: Successfully added bulk document's to index ${indexName}`);
    return res;
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to add bulk document's to index '${indexName}': ${error.message}`);
    throw error;
  }
};

/*
  Search index documents.
  Note: Right now we use search with search_after.
  This allows us to return all results in batches of 10k.
*/
const search = async (indexName, fields, query, passedClient, overrideBatchSize) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Total hits.
    let totalHits = [];

    // Loop vars.
    const maxLoopIterations = 9;
    let retrieveAgain = true;
    const batchSize = overrideBatchSize || 10000; // Default batch size to 10k.
    let loopIterations = 0;
    let res;
    let searchAfter;

    // Create query section.
    // ReadMe:
    // If we have more than one word (term) then use phrase matching
    // If we have only one word (term) use query string with wildcards.
    // Site Ref: https://opensearch.org/docs/latest/opensearch/query-dsl/full-text/
    const isWildCardMatch = query.trim().split(' ').length <= 1;
    const queryBody = isWildCardMatch
      ? {
        bool: {
          should: wildCardQuery(fields, query),
        },
      }
      : {
        bool: {
          should: matchPhraseQuery(fields, query),
        },
      };

    // Create search body.
    let body = {
      size: batchSize,
      timeout: '120s',
      query: queryBody,
      sort: [
        {
          id: {
            order: 'asc', // necessary for batch processing.
          },
        },
      ],
    };

    while (retrieveAgain && loopIterations <= maxLoopIterations) {
      // Search an index.
      res = await client.search({
        index: indexName,
        body,
      });

      // Get hits.
      const hits = res.body.hits.hits || res.body.hits;

      // Check if these are new results.
      if (hits && hits.length > 0) {
        // Append new hits.
        totalHits = [...totalHits, ...hits];

        // Get search_after from last hit.
        const lastHit = hits.pop();

        // Set search_after.
        searchAfter = lastHit.sort;

        // Update search_after.
        body = { ...body, search_after: searchAfter };

        // Increase loop count.
        loopIterations += 1;

        // If we don't have a sort after (undefined) stop looping.
        retrieveAgain = searchAfter;
      } else {
        retrieveAgain = false;
      }
    }
    logger.info(`AWS OpenSearch: Successfully searched the index ${indexName} using query '${query}`);
    return { hits: totalHits };
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to search the index '${indexName}' with query '${query}': ${error.message}`);
    throw error;
  }
};

/*
  Update index document.
*/
/* Notes: Body must be in the below format for update. */
/*
    const body = {
      doc: {
        specialist: 'Bruce Wayne', // We are updating the document field value specialist.
      },
    };
*/
const updateIndexDocument = async (job) => {
  const {
    indexName, id, body, passedClient,
  } = job.data;
  let res;
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Update index document.
    res = await client.update({
      index: indexName,
      id,
      body,
      doc_as_upsert: true, // create if doesn't exist.
      refresh: true, // triggers manual refresh.
    });

    logger.info(`AWS OpenSearch: Successfully updated document index ${indexName} for id ${id}`);
    return { data: job.data, status: res.statusCode, res };
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to update the index '${indexName} for id ${id}': ${error.message}`);
    return { data: job.data, status: res.statusCode, res };
  }
};

/*
  Delete an index document.
*/
const deleteIndexDocument = async (job) => {
  const {
    indexName, id, passedClient,
  } = job.data;
  let res;
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Delete index document.
    res = await client.delete({
      index: indexName,
      id,
      refresh: true, // triggers manual refresh.
      body: { ignore_unavailable: true },
    });
    logger.info(`AWS OpenSearch: Successfully deleted document '${id}' for index '${indexName}'`);

    return { data: job.data, status: res.statusCode, res };
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to delete document '${id}' for index '${indexName}': ${error.message}`);
    return { data: job.data, status: res ? res.statusCode : 500, res: res || undefined };
  }
};

/*
  Delete an index.
*/
const deleteIndex = async (indexName, passedClient) => {
  let res;
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Delete.
    res = await client.indices.delete({
      index: indexName,
    });
    logger.info(`AWS OpenSearch: Successfully deleted index '${indexName}'`);
    return res;
  } catch (error) {
    const alreadyExisted = error.meta.body.error.type === 'index_not_found_exception';
    if (!alreadyExisted) {
      auditLogger.error(`AWS OpenSearch Error: Unable to delete index '${indexName}': ${error.message}`);
      throw error;
    }
    return res;
  }
};

export {
  getClient,
  createIndex,
  addIndexDocument,
  updateIndexDocument,
  search,
  deleteIndexDocument,
  deleteIndex,
  bulkIndex,
};
