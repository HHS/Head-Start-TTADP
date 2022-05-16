import {
  createIndex,
  addIndexDocument,
  search,
  updateIndexDocument,
  deleteIndexDocument,
  deleteIndex,
} from '../../lib/awsElasticSearch';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:SITE_SEARCH';

const logContext = {
  namespace,
};

export async function createSearchIndex(req, res) {
  try {
    const {
      index,
    } = req.query;

    const searchResultRes = await createIndex(index);
    if (!searchResultRes) {
      res.sendStatus(404);
      return;
    }
    res.json(searchResultRes);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function addIndexDocuments(req, res) {
  try {
    const {
      index,
      id,
      body,
    } = req.query;

    const addDocumentRes = await addIndexDocument(index, id, body);
    res.json(addDocumentRes);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
/* Notes: Body must be in the below format for update. */
/*
    const body = {
      doc: {
        specialist: 'Bruce Wayne', // We are updating the document field value specialist.
      },
    };
*/
export async function updateDocument(req, res) {
  try {
    const {
      index,
      id,
      body,
    } = req.query;

    const updatedIndexRes = await updateIndexDocument(index, id, body);
    res.json(updatedIndexRes);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function searchIndex(req, res) {
  try {
    const {
      index,
      searchFields,
      searchQuery,
    } = req.query;

    const searchRes = await search(index, searchFields, searchQuery);

    res.json(searchRes);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function deleteDocument(req, res) {
  try {
    const {
      index,
      id,
    } = req.query;

    const results = await deleteIndexDocument(index, id);

    res.json(results);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function deleteSearchIndex(req, res) {
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
