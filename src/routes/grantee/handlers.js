import { DECIMAL_BASE } from '../../constants';
import { granteeByIdAndRegion } from '../../services/grantee';

// eslint-disable-next-line import/prefer-default-export
export async function getGrantee(req, res) {
  try {
    const { granteeId } = req.params;
    const { region } = req.query;
    // this doesn't do anything with the region passed as a url '?' param
    // as of yet, but will eventually need to
    const regionId = parseInt(region, DECIMAL_BASE);
    const grantee = await granteeByIdAndRegion(granteeId, regionId);
    if (!grantee) {
      res.sendStatus(404);
      return;
    }

    res.json(grantee);
  } catch (err) {
    res.sendStatus(500);
  }
}
