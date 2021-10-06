import { granteeByScopes, granteesByNameAndRegion } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:GRANTEE';

const logContext = {
  namespace,
};

export async function getGrantee(req, res) {
  try {
    const { granteeId } = req.params;
    const { modelType } = req.query;

    const scopes = filtersToScopes(req.query, modelType);
    const grantee = await granteeByScopes(granteeId, scopes);

    if (!grantee) {
      res.sendStatus(404);
      return;
    }

    res.json(grantee);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function searchGrantees(req, res) {
  try {
    const {
      s, sortBy, direction, offset,
    } = req.query;
    const scopes = filtersToScopes(req.query, 'grant');
    const grantees = await granteesByNameAndRegion(s, scopes, sortBy, direction, offset);
    if (!grantees) {
      res.sendStatus(404);
      return;
    }
    res.json(grantees);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
