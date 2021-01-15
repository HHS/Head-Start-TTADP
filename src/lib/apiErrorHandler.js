import { INTERNAL_SERVER_ERROR } from 'http-codes';
import Sequelize from 'sequelize';
import createRequestError from '../services/requestErrors';
import logger from '../logger';

/**
 * Handles sequelize errors
 *
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} error - error
 * @param {*} logContext - useful data for logging
 */
async function handleSequelizeError(req, res, error, logContext) {
  try {
    const requestErrorId = await createRequestError({
      operation: 'SequelizeError',
      uri: req.originalUrl,
      method: req.method,
      requestBody: { ...req.body },
      responseBody: { ...error, errorStack: error.stack },
      responseCode: INTERNAL_SERVER_ERROR,
    });
    logger.error(`${logContext.namespace} id: ${requestErrorId} Sequelize error ${error.stack}`);
  } catch (err) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to save to db - ${error}`);
  }
  res.status(INTERNAL_SERVER_ERROR).end();
}

export const handleError = async (req, res, error, logContext) => {
  if (process.env.NODE_ENV === 'development') {
    logger.error(error);
  }
  if (error instanceof Sequelize.Error) {
    await handleSequelizeError(req, res, error, logContext);
  } else {
    logger.error(`${logContext.namespace} - UNEXPECTED ERROR - ${error.stack}`);
    res.status(INTERNAL_SERVER_ERROR).end();
  }
};

/**
 * Handles any unexpected errors in an error handler catch block
 *
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} error - error
 * @param {*} logContext - useful data for logging
 */
export function handleUnexpectedErrorInCatchBlock(req, res, error, logContext) {
  logger.error(`${logContext.namespace} - Unexpected error in catch block - ${error}`);
  res.status(INTERNAL_SERVER_ERROR).end();
}

/**
 * Handles API errors. Saves data in the RequestErrors table and sends 500 error.
 *
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} error - error
 * @param {*} logContext - useful data for logging
 */
export default async function handleErrors(req, res, error, logContext) {
  try {
    await handleError(req, res, error, logContext);
  } catch (e) {
    handleUnexpectedErrorInCatchBlock(req, res, e, logContext);
  }
}
