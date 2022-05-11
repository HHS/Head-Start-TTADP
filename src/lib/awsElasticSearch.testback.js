/* eslint-disable no-underscore-dangle */
import {
  createIndex, deleteIndex, addIndexDocument, search, updateIndexDocument, deleteIndexDocument,
} from './awsElasticSearch';

const oldEnv = { ...process.env };

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Tests aws elastic search', () => {
  afterEach(() => { process.env = oldEnv; });
  it('create / update / search / delete index', async () => {
    const indexName = 'test-ar-index37';
    const documentOne = {
      id: 1,
      title: 'My Region 1 Activity Report',
      specialist: 'James Bond',
      year: '2022',
    };
    const documentTwo = {
      id: 2,
      title: 'My Region 2 Activity Report',
      specialist: 'Harry Potter',
      year: '2021',
    };
    const documentThree = {
      id: 3,
      title: 'My Region 3 Activity Report',
      specialist: 'Jack Sparrow',
      year: '2020',
    };

    // Create index.
    await createIndex(indexName);

    // Add documents.
    await addIndexDocument(indexName, 1, documentOne);
    await addIndexDocument(indexName, 2, documentTwo);
    await addIndexDocument(indexName, 3, documentThree);

    // Search for initial index value.
    let results = await search(indexName, ['title', 'specialist', 'year'], 'Potter');
    expect(results.hits.length).toBe(1);
    expect(results.hits[0]._source.title).toBe('My Region 2 Activity Report');

    // Update index document.
    const body = {
      doc: {
        specialist: 'Bruce Wayne',
      },
    };
    await updateIndexDocument(indexName, 2, body);

    // Search updated index.
    results = await search(indexName, ['title', 'specialist', 'year'], 'Bruce');
    expect(results.hits.length).toBe(1);
    expect(results.hits[0]._source.title).toBe('My Region 2 Activity Report');
    expect(results.hits[0]._source.specialist).toBe('Bruce Wayne');

    // Delete a index document.
    await deleteIndexDocument(indexName, 2);

    // Search for deleted document.
    results = await search(indexName, ['title', 'specialist', 'year'], 'Bruce');
    expect(results.hits.length).toBe(0);

    // Search for existing document.
    results = await search(indexName, ['title', 'specialist', 'year'], 'Bond');
    expect(results.hits.length).toBe(1);
    expect(results.hits[0]._source.title).toBe('My Region 1 Activity Report');

    // Delete index.
    await deleteIndex(indexName);

    expect(true).toBe(true);
  });
});
