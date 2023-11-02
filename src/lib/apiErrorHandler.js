import { INTERNAL_SERVER_ERROR } from 'http-codes';
import Sequelize from 'sequelize';
import createRequestError from '../services/requestErrors';
import { auditLogger as logger } from '../logger';

async function logRequestError(req, operation, error, logContext) {
  if (operation !== 'SequelizeError'
  && process.env.SUPPRESS_ERROR_LOGGING
  && process.env.SUPPRESS_ERROR_LOGGING.toLowerCase() === 'true') {
    return 0;
  }
  try {
    const responseBody = typeof error === 'object' && error !== null ? { ...error, errorStack: error?.stack } : error;
    const requestBody = {
      ...(req.body
        && typeof req.body === 'object'
        && Object.keys(req.body).length > 0
        && { body: req.body }),
      ...(req.params
        && typeof req.params === 'object'
        && Object.keys(req.params).length > 0
        && { params: req.params }),
      ...(req.query
        && typeof req.query === 'object'
        && Object.keys(req.query).length > 0
        && { query: req.query }),
    };
    const requestErrorId = await createRequestError({
      operation,
      uri: req.originalUrl,
      method: req.method,
      requestBody,
      responseBody,
      responseCode: INTERNAL_SERVER_ERROR,
    });
    return requestErrorId;
  } catch (e) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to store RequestError - ${e}`);
  }
  return null;
}

export const handleError = async (req, res, error, logContext) => {
  if (process.env.NODE_ENV === 'development') {
    logger.error(error);
  }
  let operation;
  let label;

  if (error instanceof Sequelize.Error) {
    operation = 'SequelizeError';
    label = 'Sequelize error';
  } else {
    operation = 'UNEXPECTED_ERROR';
    label = 'UNEXPECTED ERROR';
  }

  const requestErrorId = await logRequestError(req, operation, error, logContext);
  let errorMessage;
  if (error?.stack) {
    errorMessage = error.stack;
  } else {
    errorMessage = error;
  }
  if (requestErrorId) {
    logger.error(`${logContext.namespace} - id: ${requestErrorId} ${label} - ${errorMessage}`);
  } else {
    logger.error(`${logContext.namespace} - ${label} - ${errorMessage}`);
  }
  res.status(INTERNAL_SERVER_ERROR).end();
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
