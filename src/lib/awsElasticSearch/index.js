/* eslint-disable camelcase */
import { Client, Connection } from '@opensearch-project/opensearch';
import aws4 from 'aws4';
import { auditLogger, logger } from '../../logger';

/*
  Primary Docs:
  https://github.com/opensearch-project/opensearch-js/blob/HEAD/USER_GUIDE.md
  https://opensearch.org/docs/latest/api-reference/index-apis/create-index/
*/
/*
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
*/

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
const nodeAddress = 'http://localhost:9200';
const getClient = async () => new Client({
  ...createAwsConnector(
    {
      node: nodeAddress,
      accessKeyId: 'admin',
      secretAccessKey: 'admin',
    },
    'us-gov-west-1',
  ),
  node: nodeAddress,
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
const addIndexDocument = async (indexName, id, document, passedClient) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Add a document to an index.
    const res = await client.index({
      index: indexName,
      id,
      body: document,
      refresh: true, // triggers manual refresh.
    });
    logger.info(`AWS OpenSearch: Successfully added document to index ${indexName}`);
    return res;
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to add document to index '${indexName}': ${error.message}`);
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
*/
const search = async (indexName, fields, query, passedClient) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Create search body.
    const body = {
      // size: 20,
      query: {
        multi_match: {
          query,
          fields,
        },
      },
    };

    // Search an index.
    const res = await client.search({
      index: indexName,
      body,
    });
    logger.info(`AWS OpenSearch: Successfully searched the index ${indexName} using query '${query}`);
    return res.body.hits;
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
const updateIndexDocument = async (indexName, id, body, passedClient) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Update index document.
    const res = await client.update({
      index: indexName,
      id,
      body,
      refresh: true, // triggers manual refresh.
    });

    logger.info(`AWS OpenSearch: Successfully updated document  index ${indexName} for id ${id}`);
    return res;
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to update the index '${indexName} for id ${id}': ${error.message}`);
    throw error;
  }
};

/*
  Delete an index document.
*/
const deleteIndexDocument = async (indexName, id, passedClient) => {
  try {
    // Initialize the client.
    const client = passedClient || await getClient();

    // Delete index document.
    const res = await client.delete({
      index: indexName,
      id,
      refresh: true, // triggers manual refresh.
    });

    logger.info(`AWS OpenSearch: Successfully deleted document '${id}' for index '${indexName}'`);
    return res;
  } catch (error) {
    auditLogger.error(`AWS OpenSearch Error: Unable to delete document '${id}' for index '${indexName}': ${error.message}`);
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
