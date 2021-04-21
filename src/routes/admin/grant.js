import express from 'express';
import { cdiGrants, grantById, assignCDIGrant } from '../../services/grant';
import Grant from '../../policies/grant';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:GRANTS';

/**
 * Gets all CDI grants from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getCDIGrants(req, res) {
  try {
    const { unassigned, active } = req.query;
    const grants = await cdiGrants(unassigned, active);
    res.json(grants);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
}

export async function assignRegionGranteeToCDIGrant(req, res) {
  try {
    const { grantId } = req.params;
    const grant = await grantById(grantId);
    const authorization = new Grant(grant);

    if (!authorization.canAssignRegionAndGrantee()) {
      res.sendStatus(409);
      return;
    }

    const { regionId, granteeId } = req.body;
    await assignCDIGrant(grant, regionId, granteeId);
    const newGrant = await grantById(grantId);
    res.json(newGrant);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
}

const router = express.Router();

router.get('/cdi', getCDIGrants);
router.put('/cdi/:grantId', assignRegionGranteeToCDIGrant);

export default router;
