import { granteeByScopes } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';
import determineFiltersToScopes from '../../scopes';

const namespace = 'SERVICE:GRANTEE';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
export async function getGrantee(req, res) {
  try {
    const { granteeId } = req.params;
    const { widgetType } = req.query;

    const scopes = determineFiltersToScopes(req.query, widgetType);
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
