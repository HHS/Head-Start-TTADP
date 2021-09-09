import { granteeByIdAndRegion } from '../../services/grantee';

// eslint-disable-next-line import/prefer-default-export
export async function getGrantee(req, res) {
  try {
    const { granteeId } = req.params;
    // this doesn't do anything with the region passed as a url '?' param
    // as of yet, but will eventually need to
    const grantee = await granteeByIdAndRegion(granteeId);
    if (!grantee) {
      res.sendStatus(404);
      return;
    }
    res.json(grantee);
  } catch (err) {
    res.sendStatus(500);
  }
}
