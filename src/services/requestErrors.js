import models from '../models';

export default async function createRequestError({
  operation,
  uri,
  method,
  requestBody,
  responseBody = 'N/A',
  responseCode = 'N/A',
}) {
  try {
    const requestErrorBody = {
      operation, uri, method, requestBody, responseBody, responseCode,
    };
    const requestError = await models.RequestErrors.create(requestErrorBody);
    return requestError.id;
  } catch (err) {
    throw new Error('Error creating RequestError entry');
  }
}
