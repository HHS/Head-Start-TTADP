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
const realignOrdinals = async (sequelize, instance, options, matchColumn, orderColumn, includes, skipDeleted = false) => {
  const value = instance[matchColumn];
  const model = instance.constructor;

  // Create the where clause for the query
  const whereClause = { [matchColumn]: value };
  if (!skipDeleted) {
    whereClause.deletedAt = { [Op.ne]: null };
  }

  // Retrieve the results from the database
  const results = await model.findAll({
    attributes: [
      'id',
      orderColumn,
    ],
    include: includes,
    where: whereClause,
    order: [orderColumn],
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
  instance,
  options,
  matchColumn,
  skipDeleted = false,
) => realignOrdinals(
  sequelize,
  instance,
  options,
  matchColumn,
  [Sequelize.col('Reports.startDate'), 'startDate'],
  [{
    model: Reports,
    as: 'report',
    attributes: ['startDate'],
    required: true,
  }],
  skipDeleted = false,
);
