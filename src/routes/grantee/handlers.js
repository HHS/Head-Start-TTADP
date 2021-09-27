import { DECIMAL_BASE } from '../../constants';
import { granteeByScopes } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:GRANTEE';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
export async function getGrantee(req, res) {
  try {
    const { granteeId } = req.params;
    const { region } = req.query;
    const regionId = region ? parseInt(region, DECIMAL_BASE) : null;
    const grantee = await granteeByScopes(granteeId, regionId);
    if (!grantee) {
      res.sendStatus(404);
      return;
    }
    res.json(grantee);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
