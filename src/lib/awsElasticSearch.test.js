import Mock from '@elastic/elasticsearch-mock';
import {
  createIndex, addIndexDocument, search, updateIndexDocument, deleteIndexDocument, deleteIndex,
} from './awsElasticSearch';

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

const documentDeletedExpected = {
  body: {
    _index: 'ar-test-index',
    _type: '_doc',
    _id: '1',
    _version: 3,
    result: 'deleted',
    forced_refresh: true,
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
    _seq_no: 4,
    _primary_term: 1,
  },
  statusCode: 200,
};

const deleteIndexExpected = {
  body: {
    _index: 'ar-test-index',
    _type: '_doc',
    _id: '1',
    _version: 3,
    result: 'deleted',
    forced_refresh: true,
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
    _seq_no: 4,
    _primary_term: 1,
  },
  statusCode: 200,
};

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
  method: ['POST'],
  path: ['/test-index/_update/1'],
}, () => expectedIndexCreation);

// Delete Index Document Mock.
mock.add({
  method: ['DELETE'],
  path: ['/test-index/_doc/1'],
}, () => documentDeletedExpected);

// Delete Index Mock.
mock.add({
  method: ['DELETE'],
  path: ['/test-index'],
}, () => deleteIndexExpected);

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

  it('updates index document', async () => {
    const res = await updateIndexDocument(indexName, 1, indexDocumentToAdd, myMockClient);
    await expect(res.body).toStrictEqual(expectedIndexDocument);
  });

  it('deletes index document', async () => {
    const res = await deleteIndexDocument(indexName, 1, myMockClient);
    await expect(res).toStrictEqual(documentDeletedExpected);
  });

  it('deletes index', async () => {
    const res = await deleteIndex(indexName, myMockClient);
    await expect(res).toStrictEqual(deleteIndexExpected);
  });
});
