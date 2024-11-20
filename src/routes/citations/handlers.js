/* eslint-disable import/prefer-default-export */
import httpCodes from 'http-codes';
import {
  DECIMAL_BASE,
} from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import User from '../../policies/user';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { getCitationsByGrantIds } from '../../services/citations';

const namespace = 'SERVICE:CITATIONS';

const logContext = { namespace };

export const getCitationsByGrants = async (req, res) => {
  try {
    // Get the grant we need citations for.
    const { regionId } = req.params;
    const { grantIds } = req.query;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new User(user);
    const regionNumber = parseInt(regionId, DECIMAL_BASE);
    if (!authorization.canWriteInRegion(regionNumber)) {
      res.sendStatus(403);
      return;
    }

    // Get the citations for the grant.
    const citations = await getCitationsByGrantIds(grantIds);

    // Return the citations.
    res.status(httpCodes.OK).send(citations);
  } catch (error) {
    // Handle any errors that occur.
    await handleErrors(req, res, error, logContext);
  }
};
