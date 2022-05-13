import Mock from '@elastic/elasticsearch-mock';
import { createIndex, addIndexDocument, search, updateIndexDocument } from './awsElasticSearch';

const { Client } = require('@elastic/elasticsearch');

const mock = new Mock();
const myMockClient = new Client({
  node: 'http://localhost:9200',
  Connection: mock.getConnection(),
});

const indexName = 'test-index';

const expectedSearchResult = {
  body: {
    total: { value: 1, relation: 'eq' },
    max_score: 0.9808291,
    hits: [{
      _index: 'test-index',
      _type: '_doc',
      _id: '2',
      _score: 0.9808291,
      _source: {
        id: 2, title: 'My Region 2 Activity Report', specialist: 'Harry Potter', year: '2021',
      },
    }],
  },
};

const expectedIndexCreation = {
  body: {
    acknowledged: true,
    shards_acknowledged: true,
    index: 'ar-test-index',
  },
  statusCode: 200,
};

const indexDocumentToAdd = {
  id: 1,
  title: 'My Region 2 Activity Report',
  specialist: 'Harry Potter',
  year: '2021',
};

const expectedIndexDocument = {
  acknowledged: true,
  shards_acknowledged: true,
  index: 'ar-test-index',
};

/* {
  body: {
    _index: 'ar-test-index',
    _type: '_doc',
    _id: '1',
    _version: 1,
    result: 'created',
    forced_refresh: true,
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
    _seq_no: 0,
    _primary_term: 1,
    acknowledged: true,
    index: 'ar-test-index',
    shards_acknowledged: true,
  },
  statusCode: 201,
}; */

// Create Index Mock.
mock.add({
  method: ['PUT'],
  path: ['/:index'],
}, () => expectedIndexCreation);

// Add Index Document Mock.
mock.add({
  method: ['PUT'],
  path: ['/test-index/_doc/1'],
}, () => expectedIndexCreation);

// Search Mock.
mock.add({
  method: ['GET', 'POST'],
  path: ['/_search', '/:index/_search'],
}, () => expectedSearchResult);

// Update Index Document Mock.
mock.add({
  method: ['PATCH'],
  path: ['/test-index/_doc/1'],
}, () => expectedIndexCreation);

// Delete

/*
const expectedSearchCriteria = {
  index: 'test-index',
  body:
{
  query: {
    multi_match: {
      query: 'potter',
      fields: ['specialist'],
    },
  },
},
};
*/

describe('Tests aws elastic search', () => {
  afterAll(async () => {
    mock.clearAll();
  });
  it('create index', async () => {
    const res = await createIndex(indexName, myMockClient);
    await expect(res.body).toStrictEqual(expectedIndexCreation.body);
  });

  it('adds index document', async () => {
    const res = await addIndexDocument(indexName, 1, indexDocumentToAdd, myMockClient);
    await expect(res.body).toStrictEqual(expectedIndexDocument);
  });

  it('calls search', async () => {
    const res = await search(indexName, ['specialist'], 'potter', myMockClient);
    await expect(res).toStrictEqual(expectedSearchResult.body.hits);
  });

/*  it('updates index document', async () => {
    const res = await updateIndexDocument(indexName, 1, indexDocumentToAdd, myMockClient);
    await expect(res.body).toStrictEqual(expectedIndexDocument);
  });
});*/
