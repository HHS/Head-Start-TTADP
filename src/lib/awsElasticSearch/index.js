/* eslint-disable dot-notation */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import { Client, Connection } from '@opensearch-project/opensearch';
import aws4 from 'aws4';
import { auditLogger, logger } from '../../logger';

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
          access_key: accessKey,
          secret_key: secretKey,
        },
      }],
    } = JSON.parse(process.env.VCAP_SERVICES);

    return {
      uri,
      accessKey,
      secretKey,
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
  accessKey,
  secretKey,
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
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    'us-gov-west-1',
  ),
  node: uri,
});
/*
  Create an index that can have searchable documents assigned.
*/
const createIndex = async (indexName, passedClient) => {
  // Initialize the client.
  const client = passedClient || await getClient();

  // Create index.
  const res = await client.indices.create({
    index: indexName,
  });

  logger.info(`AWS OpenSearch: Successfully created index ${indexName}`);
  return res;
};
/*
  Assign a searchable document to an index.
  NOTE: We add a param called 'preventRethrow' in CircleCi as we don't have access to AWS ES.
*/
const addIndexDocument = async (job) => {
  const {
    indexName, id, document, passedClient, preventRethrow,
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

    return { data: job.data, status: 200, res };
  } catch (error) {
    if (preventRethrow) {
      // This path is for running in CI.
      return { data: job.data, status: 500, res };
    }
    throw error;
  }
};
/*
  Bulk document index.
  Documents should be in following structure:
  { "create": { "_index": "movies", "_id": "tt1392214" } }
  { "title": "Prisoners", "year": 2013 }
*/
const bulkIndex = async (documents, indexName, passedClient) => {
  // Initialize the client.
  const client = passedClient || await getClient();

  // Add a document to an index.
  const res = await client.bulk({
    body: documents,
    refresh: true, // triggers manual refresh.
  });
  logger.info(`AWS OpenSearch: Successfully added bulk document's to index ${indexName}`);
  return res;
};
/*
  Search index documents.
*/
const search = async (indexName, fields, query, passedClient) => {
  // Initialize the client.
  const client = passedClient || await getClient();

  // Create query section.
  // ReadMe:
  // If we have more than one word (term) then use phrase matching
  // If we have only one word (term) use query string with wildcards.
  // Site Ref: https://opensearch.org/docs/latest/opensearch/query-dsl/full-text/
  const queryBody = query.trim().split(' ').length <= 1
    ? {
      query_string: {
        query: `*${query}*`,
        fields,
      },
    }
    : {
      bool: {
        should: [
          { match_phrase: { context: { slop: 0, query } } },
          { match_phrase: { nonECLKCResources: { slop: 0, query } } },
          { match_phrase: { ECLKCResources: { slop: 0, query } } },
          { match_phrase: { recipientNextSteps: { slop: 0, query } } },
          { match_phrase: { specialistNextSteps: { slop: 0, query } } },
          { match_phrase: { activityReportGoals: { slop: 0, query } } },
          { match_phrase: { activityReportObjectives: { slop: 0, query } } },
          { match_phrase: { activityReportObjectivesTTA: { slop: 0, query } } },
          { match_phrase: { activityReportObjectiveResources: { slop: 0, query } } },
        ],
      },
    };

  // Create search body.
  const body = {
    size: 2001,
    query: queryBody,
  };

  // Search an index.
  const res = await client.search({
    index: indexName,
    body,
  });
  logger.info(`AWS OpenSearch: Successfully searched the index ${indexName} using query '${query}`);
  return res.body.hits;
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

  // Initialize the client.
  const client = passedClient || await getClient();

  // Update index document.
  const res = await client.update({
    index: indexName,
    id,
    body,
    doc_as_upsert: true, // create if doesn't exist.
    refresh: true, // triggers manual refresh.
  });

  logger.info(`AWS OpenSearch: Successfully updated document index ${indexName} for id ${id}`);
  return { data: job.data, status: 200, res };
};

/*
  Delete an index document.
*/
const deleteIndexDocument = async (job) => {
  const {
    indexName, id, passedClient, preventRethrow,
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

    return { data: job.data, status: 200, res };
  } catch (error) {
    if (preventRethrow) {
      // This path is for running in CI.
      return { data: job.data, status: 500, res };
    }
    throw error;
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
    const alreadyExisted = error?.meta?.body?.error?.type === 'index_not_found_exception';
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
