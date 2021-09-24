import { DECIMAL_BASE } from '../../constants';
import { granteesByNameAndRegion } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:GRANTEE';

const logContext = {
  namespace,
};

// eslint-disable-next-line import/prefer-default-export
export async function searchGrantees(req, res) {
  try {
    const {
      s, region, sortBy, direction, offset,
    } = req.query;
    const regionId = region ? parseInt(region, DECIMAL_BASE) : null;

    const grantees = await granteesByNameAndRegion(s, regionId, sortBy, direction, offset);
    if (!grantees) {
      res.sendStatus(404);
      return;
    }
    res.json(grantees);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
