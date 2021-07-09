// import handleErrors from '../../lib/apiErrorHandler';
import {
  requestErrors, requestErrorById, requestErrorsByIds, delRequestErrors,
} from '../../services/requestErrors';
import { auditLogger as logger } from '../../logger';

const namespace = 'SERVICE:REQUEST_ERRORS';

const logContext = {
  namespace,
};

/**
 * Retrieve request errors
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export default async function getRequestErrors(req, res) {
  try {
    const requestErrorsWithCount = await requestErrors(req.query);
    if (!requestErrorsWithCount) {
      res.sendStatus(404);
    } else {
      res.header('Content-Range', `requestErrors */${requestErrorsWithCount.count}`);
      res.json(requestErrorsWithCount.rows);
    }
  } catch (error) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to get from db - ${error}`);
  }
}

/**
 * Retrieve request error
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getRequestError(req, res) {
  try {
    const { id } = req.params;
    const reqError = await requestErrorById(id);
    if (!reqError) {
      res.sendStatus(404);
    } else {
      res.json(reqError);
    }
  } catch (error) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to get from db - ${error}`);
  }
}

/**
 * Delete request errors
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function deleteRequestErrors(req, res) {
  try {
    const foundIds = await requestErrorsByIds(req.query);
    const result = await delRequestErrors(req.query);
    if (!result) {
      res.sendStatus(404);
    } else {
      res.json(foundIds);
    }
  } catch (error) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to delete from db - ${error}`);
  }
}
