import { awsElasticSearch } from '../../lib/awsElasticSearch';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:SITE_SEARCH';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
export async function searchSite(req, res) {
  try {
    const {
      s, sortBy, direction, offset,
    } = req.query;
    const { grant: scopes } = filtersToScopes(req.query);
    const searchResult = await awsElasticSearch(s, scopes, sortBy, direction, offset);
    if (!searchResult) {
      res.sendStatus(404);
      return;
    }
    res.json(searchResult);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
