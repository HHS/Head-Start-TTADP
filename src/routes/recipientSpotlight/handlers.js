/* eslint-disable import/prefer-default-export */
import { DECIMAL_BASE } from '@ttahub/common';
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import handleErrors from '../../lib/apiErrorHandler';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';
import { setReadRegions } from '../../services/accessValidation';
import { extractFilterArray } from './helpers';

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
      sortBy, direction, offset, limit, parsedGrantId, mustHaveIndicators,
    } = req.query;

    // Parse pagination params to integers
    const parsedOffset = offset ? parseInt(offset, DECIMAL_BASE) : 0;
    const parsedLimit = limit ? parseInt(limit, DECIMAL_BASE) : 10;

    const userId = await currentUserId(req, res);

    // Normalize region.in[] to region.in for setReadRegions compatibility
    const regionValues = extractFilterArray(req.query, 'region', 'in');
    const normalizedQuery = {
      ...req.query,
      'region.in': regionValues.length > 0 ? regionValues : undefined,
    };
    // Remove bracket key to avoid confusion
    delete normalizedQuery['region.in[]'];

    // Use setReadRegions to filter/default regions (matches widgets pattern)
    const updatedQuery = await setReadRegions(normalizedQuery, userId);
    const regionsArray = updatedQuery['region.in'].map((r) => r.toString());

    const scopes = await filtersToScopes(
      req.query,
      { userId },
    );

    const indicatorsToInclude = extractFilterArray(req.query, 'priorityIndicator', 'in');
    const indicatorsToExclude = extractFilterArray(req.query, 'priorityIndicator', 'nin');
    const recipientSpotlightData = await getRecipientSpotlightIndicators(
      scopes,
      sortBy,
      direction,
      parsedOffset,
      parsedLimit,
      regionsArray,
      indicatorsToInclude,
      indicatorsToExclude,
      parsedGrantId,
      mustHaveIndicators,
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
