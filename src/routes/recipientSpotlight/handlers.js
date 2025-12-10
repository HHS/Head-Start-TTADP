/* eslint-disable import/prefer-default-export */
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import { getUserReadRegions } from '../../services/accessValidation';
import handleErrors from '../../lib/apiErrorHandler';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';

const namespace = 'SERVICE:RECIPIENT_SPOTLIGHT';

const logContext = {
  namespace,
};

/*
getRecipientSpotLight():
 Get the recipient spotlights (indicators) for a region,
 the recipient param is optional and if not defined will return all
 recipients in that region.
*/
export async function getRecipientSpotLight(req, res) {
  try {
    const {
      recipientId, regionId, sortBy, direction, offset, limit,
    } = req.query;

    const userId = await currentUserId(req, res);
    const userRegions = await getUserReadRegions(userId);

    const { grant: scopes } = await filtersToScopes(
      req.query,
      { userId },
    );
    const recipientSpotlightData = await getRecipientSpotlightIndicators(
      recipientId,
      regionId,
      scopes,
      sortBy,
      direction,
      offset,
      userRegions,
      limit,
    );
    if (!recipientSpotlightData) {
      res.sendStatus(404);
      return;
    }
    res.json(recipientSpotlightData);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
