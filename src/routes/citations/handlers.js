/* eslint-disable import/prefer-default-export */

import { DECIMAL_BASE } from '@ttahub/common';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import parsePositiveInteger from '../../lib/parsePositiveInteger';
import TtaRequest from '../../policies/ttaRequest';
import User from '../../policies/user';
import { getCitationsByGrantIds, textByCitation } from '../../services/citations';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';

const namespace = 'SERVICE:CITATIONS';

const logContext = { namespace };

export const getTextByCitation = async (req, res) => {
  try {
    // citations are available with a site access permission
    const { citationIds } = req.query;

    // Get the citations for the grant.
    const citationIdsArray = (() => {
      if (Array.isArray(citationIds)) {
        return citationIds;
      }

      if (citationIds && typeof citationIds === 'object') {
        return Object.values(citationIds);
      }

      return citationIds === undefined ? [] : [citationIds];
    })();

    const citations = await textByCitation(citationIdsArray.flat());

    // Return the text
    res.status(httpCodes.OK).send(citations);
  } catch (error) {
    // Handle any errors that occur.
    await handleErrors(req, res, error, logContext);
  }
};

export const getCitationsByGrants = async (req, res) => {
  try {
    // Get the grant we need citations for.
    const { regionId } = req.params;
    const { grantIds, reportStartDate } = req.query;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new User(user);
    const regionNumber = parseInt(regionId, DECIMAL_BASE);
    // citations are chosen on Activity Reports and on TTA requests, by their creators and
    // by the reviewers who can edit them
    const ttaRequestAuthorization = new TtaRequest(user, regionNumber);
    if (
      !authorization.canWriteInRegion(regionNumber) &&
      !ttaRequestAuthorization.canWriteInRegion() &&
      !ttaRequestAuthorization.canReviewInRegion()
    ) {
      res.sendStatus(403);
      return;
    }

    // Reject malformed input with a 400 instead of letting the service throw a 500.
    const parsedGrantIds = [grantIds].flat().map(parsePositiveInteger);
    if (
      !parsedGrantIds.length ||
      parsedGrantIds.includes(null) ||
      typeof reportStartDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(reportStartDate)
    ) {
      res.sendStatus(httpCodes.BAD_REQUEST);
      return;
    }

    // Get the citations for the grant.
    const citations = await getCitationsByGrantIds(parsedGrantIds, reportStartDate);

    // Return the citations.
    res.status(httpCodes.OK).send(citations);
  } catch (error) {
    // Handle any errors that occur.
    await handleErrors(req, res, error, logContext);
  }
};
