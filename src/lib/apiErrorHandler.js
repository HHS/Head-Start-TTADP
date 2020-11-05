import { INTERNAL_SERVER_ERROR } from 'http-codes';
import { Error } from 'sequelize';
import createRequestError from '../services/requestErrors';
import logger from '../logger';

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
    logger.error(`${logContext.namespace} id: ${requestErrorId} Sequelize error`);
  } catch (err) {
    logger.error(`${logContext.namespace} - Sequelize error - unable to save to db - ${err}`);
  }
  res.status(INTERNAL_SERVER_ERROR).end();
}

export const handleError = async (req, res, error, logContext) => {

  if (process.env.APP3_ENV_NAME === 'development') {
    logger.error(error);
  }
  if (error instanceof Error) {
    await handleSequelizeError(req, res, error, logContext);
  } else {
    logger.error(`${logContext.namespace} - UNEXPECTED ERROR - ${error}`);
    res.status(INTERNAL_SERVER_ERROR).end();
  }
};

export function handleUnexpectedErrorInCatchBlock(req, res, error, logContext) {
  logger.error(`${logContext.namespace} - Unexpected error in catch block - ${error}`);
  res.status(INTERNAL_SERVER_ERROR).end();
}

export default async function handleErrors(req, res, error, logContext) {
  try {
    await handleError(req, res, error, logContext);
  } catch (e) {
    handleUnexpectedErrorInCatchBlock(req, res, e, logContext);
  }
}
