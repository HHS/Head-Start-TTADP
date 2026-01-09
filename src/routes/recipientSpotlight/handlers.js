/* eslint-disable import/prefer-default-export */
import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import handleErrors from '../../lib/apiErrorHandler';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';
import { getUserReadRegions } from '../../services/accessValidation';

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
      sortBy, direction, offset, limit,
    } = req.query;

    const userId = await currentUserId(req, res);

    // Get user's read regions
    const userReadRegions = await getUserReadRegions(userId);

    // Extract requested regions from query
    // Support both region.in and region.in[] formats
    // region.in[] is produced by filtersToQueryString (standard filter system)
    // region.in is used by manual filter construction (RecipientSpotlight component)
    const requestedRegions = req.query['region.in[]'] || req.query['region.in'];

    // Check if user has access to requested regions
    if (requestedRegions) {
      // Ensure requestedRegions is an array
      const regionsArray = Array.isArray(requestedRegions) ? requestedRegions : [requestedRegions];

      // Check if all requested regions are in user's allowed regions
      const hasAccess = regionsArray.every(
        (region) => userReadRegions.includes(parseInt(region, DECIMAL_BASE)),
      );

      if (!hasAccess) {
        res.sendStatus(httpCodes.FORBIDDEN);
        return;
      }
    } else {
      // No regions requested - return forbidden
      // User must explicitly request regions they have access to
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const { grant: scopes } = await filtersToScopes(
      req.query,
      { userId },
    );
    const recipientSpotlightData = await getRecipientSpotlightIndicators(
      scopes,
      sortBy,
      direction,
      offset,
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
