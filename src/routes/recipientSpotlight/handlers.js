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

    // Parse pagination params to integers
    const parsedOffset = offset ? parseInt(offset, DECIMAL_BASE) : 0;
    const parsedLimit = limit ? parseInt(limit, DECIMAL_BASE) : 10;

    const userId = await currentUserId(req, res);

    // Get user's read regions (deduplicated)
    const userReadRegions = [...new Set(await getUserReadRegions(userId))];

    // Extract requested regions from query
    // Support both region.in and region.in[] formats
    // region.in[] is produced by filtersToQueryString (standard filter system)
    // region.in is used by manual filter construction (RecipientSpotlight component)
    const requestedRegions = req.query['region.in[]'] || req.query['region.in'];

    // Determine which regions to use:
    // If no regions requested, default to all user's read regions
    // If regions requested, validate user has access to all of them
    let regionsArray;
    if (!requestedRegions) {
      // No regions requested - use all user's read regions
      regionsArray = userReadRegions.map((r) => r.toString());
    } else {
      // Ensure requestedRegions is an array
      regionsArray = Array.isArray(requestedRegions) ? requestedRegions : [requestedRegions];

      // Check if all requested regions are in user's allowed regions
      const hasAccess = regionsArray.every(
        (region) => userReadRegions.includes(parseInt(region, DECIMAL_BASE)),
      );

      if (!hasAccess) {
        res.sendStatus(httpCodes.FORBIDDEN);
        return;
      }
    }

    const scopes = await filtersToScopes(
      req.query,
      { userId },
    );

    // Extract indicator filter params
    // Support both priorityIndicator.in and priorityIndicator.in[] formats
    const indicatorFilterIn = req.query['priorityIndicator.in[]']
      || req.query['priorityIndicator.in'];
    let indicatorsToInclude = [];
    if (indicatorFilterIn) {
      indicatorsToInclude = Array.isArray(indicatorFilterIn)
        ? indicatorFilterIn
        : [indicatorFilterIn];
    }

    const recipientSpotlightData = await getRecipientSpotlightIndicators(
      scopes,
      sortBy,
      direction,
      parsedOffset,
      parsedLimit,
      regionsArray,
      indicatorsToInclude,
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
