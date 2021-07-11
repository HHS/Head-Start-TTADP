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

export async function requestErrors({ filter = '{}', range = '[0,9]', sort = '["createdAt","DESC"]' } = {}) {
  const offset = JSON.parse(range)[0];
  const limit = JSON.parse(range)[1];
  const order = JSON.parse(sort);
  const where = JSON.parse(filter);

  return models.RequestErrors.findAndCountAll({
    where,
    order: [order],
    offset,
    limit: limit + 1,
  });
}

export async function requestErrorById(id) {
  return models.RequestErrors.findOne({
    where: { id },
  });
}

export async function requestErrorsByIds({ filter = '{}' } = {}) {
  return models.RequestErrors.findAll({
    where: JSON.parse(filter),
    attributes: ['id'],
  });
}

export async function delRequestErrors({ filter = '{}' } = {}) {
  return models.RequestErrors.destroy({
    where: JSON.parse(filter),
  });
}
