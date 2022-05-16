import { search } from '../../lib/awsElasticSearch';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:SITE_SEARCH';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
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
