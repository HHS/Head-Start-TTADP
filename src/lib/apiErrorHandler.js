import { INTERNAL_SERVER_ERROR } from 'http-codes';
import Sequelize from 'sequelize';
import createRequestError from '../services/requestErrors';
import { auditLogger as logger } from '../logger';
import { sequelize } from '../models';

/**
 * Logs a request error and stores it in the database.
 * @param {Object} req - The request object.
 * @param {string} operation - The operation name.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The logging context.
 * @returns {Promise<number|null>} - The ID of the stored request error, or null if storing failed.
 */
async function logRequestError(req, operation, error, logContext) {
  // Check if error logging should be suppressed
  if (
    operation !== 'SequelizeError'
    && process.env.SUPPRESS_ERROR_LOGGING
    && process.env.SUPPRESS_ERROR_LOGGING.toLowerCase() === 'true'
  ) {
    return 0;
  }

  try {
    // Prepare the response body for storage
    const responseBody = typeof error === 'object'
      && error !== null ? { ...error, errorStack: error?.stack } : error;

    // Prepare the request body for storage
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

    // Create a request error in the database and get its ID
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

/**
 * Handles errors in an asynchronous request.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The context for logging.
 */
export const handleError = async (req, res, error, logContext) => {
  // Check if the environment is development
  if (process.env.NODE_ENV === 'development') {
    logger.error(error);
  }

  let operation;
  let label;

  // Check if the error is an instance of Sequelize.Error
  if (error instanceof Sequelize.Error) {
    operation = 'SequelizeError';
    label = 'Sequelize error';
  } else {
    operation = 'UNEXPECTED_ERROR';
    label = 'UNEXPECTED ERROR';
  }

  // eslint-disable-next-line max-len
  if (error instanceof Sequelize.ConnectionError || error instanceof Sequelize.ConnectionAcquireTimeoutError) {
    logger.error(`${logContext.namespace} Connection Pool: ${JSON.stringify(sequelize.connectionManager.pool)}`);
  }

  // Log the request error and get the error ID
  const requestErrorId = await logRequestError(req, operation, error, logContext);

  let errorMessage;

  // Check if the error has a stack property
  if (error?.stack) {
    errorMessage = error.stack;
  } else {
    errorMessage = error;
  }

  // Log the error message with the error ID if available
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
