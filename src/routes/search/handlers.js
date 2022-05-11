import { createIndex, addIndexDocument, search, deleteIndex } from '../../lib/awsElasticSearch';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:SITE_SEARCH';

const logContext = {
  namespace,
};

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

// eslint-disable-next-line import/prefer-default-export
export async function createSearchIndex(req, res) {
  console.log('\n\n\nAt END POINT !!!!!!!!!!!!!!!!!!');
  try {
    const {
      index,
    } = req.query;

    const searchResult = await createIndex(index);
    if (!searchResult) {
      res.sendStatus(404);
      return;
    }
    res.json(searchResult);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function addIndexDocuments(req, res) {
  console.log('\n\n\nAt END POINT !!!!!!!!!!!!!!!!!!');
  try {
    const {
      index,
    } = req.query;

    const res1 = await addIndexDocument(index, 1, documentOne);
    const res2 = await addIndexDocument(index, 2, documentTwo);
    const res3 = await addIndexDocument(index, 3, documentThree);

    res.json([res1, res2, res3]);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function searchIndex(req, res) {
  console.log('\n\n\nAt END POINT !!!!!!!!!!!!!!!!!!');
  try {
    const {
      index,
      searchQuery,
    } = req.query;

    const results = await search(index, ['title', 'specialist', 'year'], searchQuery);

    res.json(results);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function deleteSearchIndex(req, res) {
  console.log('\n\n\nAt END POINT !!!!!!!!!!!!!!!!!!');
  try {
    const {
      index,
    } = req.query;

    const results = await deleteIndex(index);

    res.json(results);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
