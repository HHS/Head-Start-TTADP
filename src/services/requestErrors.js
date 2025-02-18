export default async function createRequestError({
  operation,
  uri,
  method,
  requestBody,
  responseBody = 'N/A',
  responseCode = 'N/A',
}) {
  // eslint-disable-next-line global-require
  const { RequestErrors } = require('../models');
  try {
    const requestErrorBody = {
      operation, uri, method, requestBody, responseBody, responseCode,
    };
    const requestError = await RequestErrors.create(requestErrorBody, { transaction: null });
    return requestError.id;
  } catch (err) {
    throw new Error('Error creating RequestError entry');
  }
}

export async function requestErrors({ filter = '{}', range = '[0,9]', sort = '["createdAt","DESC"]' } = {}) {
  // eslint-disable-next-line global-require
  const { RequestErrors } = require('../models');
  const offset = JSON.parse(range)[0];
  const limit = JSON.parse(range)[1];
  const order = JSON.parse(sort);
  const where = JSON.parse(filter);

  return RequestErrors.findAndCountAll({
    where,
    order: [order],
    offset,
    limit: limit + 1,
  });
}

export async function requestErrorById(id) {
  // eslint-disable-next-line global-require
  const { RequestErrors } = require('../models');
  return RequestErrors.findOne({
    where: { id },
  });
}

export async function requestErrorsByIds({ filter = '{}' } = {}) {
  // eslint-disable-next-line global-require
  const { RequestErrors } = require('../models');
  return RequestErrors.findAll({
    where: JSON.parse(filter),
    attributes: ['id'],
  });
}

export async function delRequestErrors({ filter = '{}' } = {}) {
  // eslint-disable-next-line global-require
  const { RequestErrors } = require('../models');
  return RequestErrors.destroy({
    where: JSON.parse(filter),
  });
}
