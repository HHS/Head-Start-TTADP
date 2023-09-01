const { Sequelize, Op } = require('sequelize');

/**
 * Realigns the ordinals of a model based on a matching column and an order column.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of the model.
 * @param {Object} options - Additional options for the query.
 * @param {string} matchColumn - The column used for matching.
 * @param {string} orderColumn - The column used for ordering.
 * @param {Array} includes - An array of included models.
 * @param {boolean} skipDeleted - Flag to skip deleted instances. Default is false.
 * @returns {Promise} - A promise that resolves when the ordinals are realigned.
 */
const realignOrdinals = async (
  options,
  model,
  matchColumn,
  matchValue,
  orderColumn,
  includes,
  skipDeleted = false,
) => {
  // Retrieve the results from the database
  const results = await model.findAll({
    attributes: [
      'id',
      orderColumn,
    ],
    ...(includes && { include: includes }),
    where: { [matchColumn]: matchValue },
    order: [orderColumn],
    ...(skipDeleted && { paranoid: false }),
  });

  // Update the ordinals for each result
  return Promise.all(results.map(async (result, i) => model.update(
    { ordinal: i + 1 },
    { where: { id: result.id }, transaction: options.transaction },
  )));
};

/**
 * Realigns the ordinals of a report model based on its start date.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of the report model.
 * @param {Object} options - Additional options for the query.
 * @param {string} matchColumn - The column used for matching.
 * @param {boolean} skipDeleted - Flag to skip deleted instances. Default is false.
 * @returns {Promise} - A promise that resolves when the ordinals are realigned.
 */
const realignReportOrdinals = async (
  sequelize,
  options,
  model,
  matchColumn,
  matchValue,
  skipDeleted = false,
) => realignOrdinals(
  options,
  model,
  matchColumn,
  matchValue,
  [Sequelize.col('Reports.startDate'), 'startDate'],
  [{
    model: sequelize.models.Reports,
    as: 'report',
    attributes: ['startDate'],
    required: true,
  }],
  skipDeleted,
);

module.exports = {
  realignOrdinals,
  realignReportOrdinals,
};
