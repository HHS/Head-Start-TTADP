import { granteeByScopes } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:GRANTEE';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
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
