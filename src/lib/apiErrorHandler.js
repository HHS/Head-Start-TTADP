import { INTERNAL_SERVER_ERROR } from 'http-codes';
import Sequelize from 'sequelize';
import createRequestError from '../services/requestErrors';
import { auditLogger as logger } from '../logger';

/**
 * Logs a request error and stores it in the database.
 * @param {Object} req - The request object.
 * @param {string} operation - The operation name.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The logging context.
 * @returns {Promise<number|null>} - The ID of the stored request error, or null if storing failed.
 */
export async function logRequestError(req, operation, error, logContext) {
  // Check if error logging should be suppressed
  if (
    operation !== 'SequelizeError'
    && process.env.SUPPRESS_ERROR_LOGGING
    && process.env.SUPPRESS_ERROR_LOGGING.toLowerCase() === 'true'
  ) {
    return 0;
  }
  if (!error) {
    return 0;
  }

  try {
    const responseBody = typeof error === 'object'
      ? { ...error, errorStack: error?.stack }
      : error;

    const requestBody = {
      ...(req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0 && { body: req.body }),
      ...(req.params && typeof req.params === 'object' && Object.keys(req.params).length > 0 && { params: req.params }),
      ...(req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0 && { query: req.query }),
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
  if (process.env.NODE_ENV === 'development') {
    logger.error(error);
  }

  let operation;
  let label;

  if (error instanceof Sequelize.BaseError) {
    operation = 'SequelizeError';
    label = `${error.name}:${error.cause}`;
  } else {
    operation = 'UNEXPECTED_ERROR';
    label = 'UNEXPECTED ERROR';
  }

  if (error instanceof Sequelize.ConnectionAcquireTimeoutError) {
    logger.error(`${logContext.namespace} Critical: SequelizeConnectionAcquireTimeoutError encountered. Restarting server.`);
    throw error;
  }

  const requestErrorId = await logRequestError(req, operation, error, logContext);

  const errorMessage = typeof error === 'object' && error !== null
    ? error.stack || JSON.stringify(error)
    : error;

  if (requestErrorId) {
    logger.error(`${logContext.namespace} - id: ${requestErrorId} - ${label} - ${errorMessage}`);
  } else {
    logger.error(`${logContext.namespace} - ${label} - ${errorMessage}`);
  }

  res.status(INTERNAL_SERVER_ERROR).end();
};

/**
 * Handles any unexpected errors in an error handler catch block.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The context for logging.
 */
export function handleUnexpectedErrorInCatchBlock(req, res, error, logContext) {
  logger.error(`${logContext.namespace} - Unexpected error in catch block - ${error}`);
  res.status(INTERNAL_SERVER_ERROR).end();
  if (error instanceof Sequelize.ConnectionAcquireTimeoutError) {
    logger.error(`${logContext.namespace} - Critical error: Restarting server.`);
    throw new Error('Unhandled ConnectionAcquireTimeoutError: Restarting server due to database connection acquisition timeout.'); // Causes the server to restart
  }
}

/**
 * Handles API errors. Saves data in the RequestErrors table and sends 500 error.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The context for logging.
 */
export default async function handleErrors(req, res, error, logContext) {
  try {
    await handleError(req, res, error, logContext);
  } catch (e) {
    handleUnexpectedErrorInCatchBlock(req, res, e, logContext);
  }
}

/**
 * Logs a worker error and stores it in the database.
 * @param {Object} job - The job object.
 * @param {string} operation - The operation name.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The logging context.
 * @returns {Promise<number|null>} - The ID of the stored request error, or null if storing failed.
 */
export const logWorkerError = async (job, operation, error, logContext) => {
  if (
    operation !== 'SequelizeError'
    && process.env.SUPPRESS_ERROR_LOGGING
    && process.env.SUPPRESS_ERROR_LOGGING.toLowerCase() === 'true'
  ) {
    return 0;
  }
  if (!error) {
    return 0;
  }

  try {
    const responseBody = typeof error === 'object'
      ? { ...error, errorStack: error?.stack }
      : error;

    const requestBody = {
      ...(job.data && typeof job.data === 'object' && Object.keys(job.data).length > 0 && { data: job.data }),
    };

    const requestErrorId = await createRequestError({
      operation,
      uri: job.queue.name,
      method: 'PROCESS_JOB',
      requestBody,
      responseBody,
      responseCode: INTERNAL_SERVER_ERROR,
    });

    return requestErrorId;
  } catch (e) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to store RequestError - ${e}`);
  }

  return null;
};

/**
 * Handles errors in a worker job.
 * @param {Object} job - The job object.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The context for logging.
 */
export const handleWorkerError = async (job, error, logContext) => {
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

  if (error instanceof Sequelize.ConnectionAcquireTimeoutError) {
    logger.error(`${logContext.namespace} - Critical error: Restarting server.`);
    throw error;
  }

  const requestErrorId = await logWorkerError(job, operation, error, logContext);

  const errorMessage = error?.stack || error;

  if (requestErrorId) {
    logger.error(`${logContext.namespace} - id: ${requestErrorId} ${label} - ${errorMessage}`);
  } else {
    logger.error(`${logContext.namespace} - ${label} - ${errorMessage}`);
  }

  // Handle job failure as needed
};

/**
 * Handles any unexpected errors in a worker error handler catch block.
 * @param {Object} job - The job object.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The context for logging.
 */
export const handleUnexpectedWorkerError = (job, error, logContext) => {
  logger.error(`${logContext.namespace} - Unexpected error in catch block - ${error}`);
  if (error instanceof Sequelize.ConnectionAcquireTimeoutError) {
    logger.error(`${logContext.namespace} - Critical error: Restarting server.`);
    throw new Error('Unhandled ConnectionAcquireTimeoutError: Restarting server due to database connection acquisition timeout.'); // Causes the server to restart
  }
};

/**
 * Handles worker job errors. Logs the error and stores it in the database.
 * @param {Object} job - The job object.
 * @param {Error} error - The error object.
 * @param {Object} logContext - The context for logging.
 */
export const handleWorkerErrors = async (job, error, logContext) => {
  try {
    await handleWorkerError(job, error, logContext);
  } catch (e) {
    handleUnexpectedWorkerError(job, e, logContext);
  }
};
