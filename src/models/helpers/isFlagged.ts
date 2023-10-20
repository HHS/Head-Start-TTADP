import { Op, Sequelize } from 'sequelize';
import { skipIf } from './flowControl';

/**
 * This function automatically populates a flag field in an instance if it is undefined or null.
 * It also ensures that the flag field is included in the fields array of options.
 * @param flagName - The name of the flag field.
 * @param sequelize - The Sequelize instance.
 * @param instance - The instance to populate the flag field for.
 * @param options - The options object containing the fields array.
 */
const autoPopulateIsFlagged = (
  flagName: string,
  instance,
  options,
): void => {
  // Check if the 'autoPopulateIsFlagged' option is set to true, and skip if so
  if (skipIf(options, 'autoPopulateIsFlagged')) return;

  // Check if flagName is undefined or null
  if (instance[flagName] === undefined || instance[flagName] === null) {
    // Set flagName to false
    instance.set(flagName, false);

    // Check if flagName is not included in the fields array
    if (!options.fields.includes(flagName)) {
      // Add flagName to the fields array
      options.fields.push(flagName);
    }
  }
};

/**
 * This function auto-populates the 'isFoiaable' property in the given instance using the
 * provided sequelize ORM.
 * @param {Object} instance - The instance to be populated.
 * @param {Object} options - Additional options for auto-population.
 * @returns {void}
 */
const autoPopulateIsFoiaable = (
  instance,
  options,
): void => {
  // Call the autoPopulateIsFlagged function with the necessary arguments
  autoPopulateIsFlagged(
    'isFoiaable', // Flag name
    instance, // Instance to be populated
    options, // Additional options
  );
};

/**
 * This function is used to auto-populate the 'isReferenced' flag in a Sequelize model instance.
 * It calls the 'autoPopulateIsFlagged' function with the provided parameters.
 *
 * @param instance - The Sequelize model instance.
 * @param options - Additional options for auto-population.
 */
const autoPopulateIsReferenced = (
  instance, // The Sequelize model instance.
  options, // Additional options for auto-population.
): void => {
  autoPopulateIsFlagged( // Call the 'autoPopulateIsFlagged' function.
    'isReferenced', // The flag name.
    instance, // The Sequelize model instance.
    options, // Additional options for auto-population.
  );
};

//----------------------------------------------------

/**
 * Recalculates the value of a flag for a given set of model instances.
 * @param flagName - The name of the flag to recalculate.
 * @param sequelize - The Sequelize instance.
 * @param options - Additional options for the query.
 * @param ids - The IDs of the model instances to recalculate the flag for.
 * @param model - The Sequelize model to perform the query on.
 * @param reportIntermediateModel - The intermediate model for the report association (optional).
 * @param reportAs - The alias for the report association (optional).
 * @param activityReportIntermediateModel - The intermediate model for the activity report
 * association (optional).
 * @param activityReportIntermediateAs - The alias for the activity report association (optional).
 * @returns A promise that resolves with an array containing the results of the update operations.
 */
const recalculateIsFlagged = async (
  flagName: string,
  sequelize,
  options,
  ids,
  model,
  {
    reportIntermediateModel,
    reportAs,
    activityReportIntermediateModel,
    activityReportIntermediateAs,
  } = null,
) => {
  // Define the where clause for the report association
  const reportWhere = {
    model: sequelize.models.Report,
    as: 'reports',
    attributes: [],
    through: {
      attributes: [],
    },
    required: false,
    include: [
      {
        model: sequelize.models.Report,
        as: 'status',
        required: true,
        attributes: [],
        where: {
          isTerminal: true,
        },
      },
    ],
  };

  // Define the where clause for the activity report association
  const activityReportWhere = {
    model: sequelize.models.ActivityReport,
    as: 'activityReports',
    attributes: [],
    through: {
      attributes: [],
    },
    required: false,
    where: {
      calculatedStatus: 'approved', // TODO: use constant
    },
  };

  // Perform the query to calculate the flag value for each model instance
  const deltas = await model.findAll({
    attributes: [
      'id',
      [
        sequelize.literal('COUNT(DISTINCT "Reports".id) + COUNT(DISTINCT "ActivityReports".id) > 0'),
        flagName,
      ],
    ],
    include: [
      (reportIntermediateModel)
        ? {
          model: reportIntermediateModel,
          as: reportAs,
          attributes: [],
          required: false,
          include: [reportWhere],
        }
        : reportWhere,
      (activityReportIntermediateModel)
        ? {
          model: activityReportIntermediateModel,
          as: activityReportIntermediateAs,
          attributes: [],
          required: false,
          include: [activityReportWhere],
        }
        : activityReportWhere,
    ],
    where: {
      id: ids,
    },
    group: [`${model.tableName}."id"`],
    having: {
      [flagName]: {
        [Op.not]: sequelize.literal('COUNT(DISTINCT "Reports".id) + COUNT(DISTINCT "ActivityReports".id) > 0'),
      },
    },
    raw: true,
    transaction: options.transaction,
  });

  // Separate the model instances into two arrays based on the flag value
  const { nowFlagged, clearFlagged } = deltas.reduce((acc, delta) => {
    if (delta[flagName]) {
      acc.nowFlagged.push(delta.id);
    } else {
      acc.clearFlagged.push(delta.id);
    }
    return acc;
  }, { nowFlagged: [], clearFlagged: [] });

  // Update the flag value for the model instances that need to be flagged or unflagged
  return Promise.all([
    (nowFlagged && nowFlagged.length)
      ? model.update(
        { [flagName]: true },
        {
          where: {
            [flagName]: false,
            id: nowFlagged,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      )
      : Promise.resolve(),
    (clearFlagged && clearFlagged.length)
      ? model.update(
        { [flagName]: false },
        {
          where: {
            [flagName]: true,
            id: clearFlagged,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      )
      : Promise.resolve(),
  ]);
};

/**
 * Recalculates the 'isFoiaable' flag for a given model and its associated intermediate models.
 *
 * @param sequelize - The Sequelize instance.
 * @param options - The Sequelize options.
 * @param ids - The IDs of the records to recalculate.
 * @param model - The model to recalculate.
 * @param reportIntermediateModel - The intermediate model used for reporting.
 * @param reportAs - The alias for the intermediate model used for reporting.
 * @param activityReportIntermediateModel - The intermediate model used for activity reporting.
 * @param activityReportIntermediateAs - The alias for the intermediate model used for activity
 * reporting.
 * @returns A Promise that resolves when the recalculation is complete.
 */
const recalculateIsFoiaable = async (
  sequelize,
  options,
  ids,
  model,
  {
    reportIntermediateModel, // Intermediate model used for reporting
    reportAs, // Alias for the intermediate model used for reporting
    activityReportIntermediateModel, // Intermediate model used for activity reporting
    activityReportIntermediateAs, // Alias for the intermediate model used for activity reporting
  } = null,
) => recalculateIsFlagged(
  'isFoiaable',
  sequelize,
  options,
  ids,
  model,
  {
    reportIntermediateModel,
    reportAs,
    activityReportIntermediateModel,
    activityReportIntermediateAs,
  },
);

/**
 * Recalculates the "isReferenced" flag for a given model.
 * @param sequelize - The Sequelize instance.
 * @param options - Additional options for the operation.
 * @param ids - An array of IDs to recalculate.
 * @param model - The model to perform the recalculation on.
 * @param reportIntermediateModel - The intermediate model used for reporting.
 * @param reportAs - The alias for the intermediate model used for reporting.
 * @param activityReportIntermediateModel - The intermediate model used for activity reporting.
 * @param activityReportIntermediateAs - The alias for the intermediate model used for activity
 * reporting.
 * @returns A promise that resolves when the recalculation is complete.
 */
const recalculateIsReferenced = async (
  sequelize,
  options,
  ids,
  model,
  {
    reportIntermediateModel,
    reportAs,
    activityReportIntermediateModel,
    activityReportIntermediateAs,
  } = null,
) => recalculateIsFlagged(
  'isReferenced',
  sequelize,
  options,
  ids,
  model,
  {
    reportIntermediateModel,
    reportAs,
    activityReportIntermediateModel,
    activityReportIntermediateAs,
  },
);

//----------------------------------------------------

/**
 * Finds flagged models from a given model.
 * @param flagName - The name of the flag column to check.
 * @param model - The model to search for associations.
 * @param prefix - The prefix to filter association names.
 * @param processed - An array of already processed table names.
 * @param includes - An array to store the include objects.
 * @param aggregates - An array to store the aggregate arrays.
 * @param aggregateObjects - An array to store the aggregate objects.
 * @returns An object containing the includes, aggregates, and aggregateObjects arrays.
 */
const findFlaggedModelsFromModel = (
  flagName,
  model,
  prefix,
  processed = [],
  includes = [],
  aggregates = [],
  aggregateObjects = [],
) => {
  // Get all associations of the model
  const associations = Object.keys(model?.associations);

  associations.forEach((associationName) => {
    const association = model.associations[associationName];
    if (association.through === undefined) {
      // Check if the association name does not have the prefix and has a column named the
      // value passed in flagName
      if (
        !association.as.startsWith(prefix)
        && association.associationType === 'BelongsTo'
        && model.tableName.endsWith(association.target.tableName)
        && association.target.rawAttributes[flagName] !== undefined
      ) {
        // Add include object for the association
        includes.push({
          model: association.target,
          as: association.as,
          attributes: [],
          required: false,
        });

        // Add aggregate array for the association
        aggregates.push([
          Sequelize.literal(`ARRAY_AGG(DISTINCT "${association.target.tableName}"."id")`),
          `${association.target.tableName}Ids`,
        ]);

        // Add aggregate object for the association
        aggregateObjects.push({
          model: association.target,
          aggregateName: `${association.target.tableName}Ids`,
        });
      } else if (
        association.as.startsWith(prefix)
        && !processed.includes(association.target.tableName)
        && association.target.name.startsWith(model.name)
      ) {
        // Recursively call the function for nested associations
        const {
          includes: nestedIncludes,
          aggregates: nestedAggregates,
          aggregateObjects: nestedAggregateObjects,
        } = findFlaggedModelsFromModel(
          flagName,
          association.target,
          prefix,
          [
            ...processed,
            model.tableName,
          ],
        );

        // Add include object for the nested association
        includes.push({
          model: association.target,
          as: association.as,
          attributes: [],
          required: false,
          ...(nestedIncludes && nestedIncludes.length && { includes: nestedIncludes }),
        });

        // Add unique aggregates from the nested association
        nestedAggregates.forEach((aggregate) => {
          if (!aggregates.find((agg) => agg[1] === aggregate[1])) {
            aggregates.push(aggregate);
          }
        });

        // Add unique aggregate objects from the nested association
        nestedAggregateObjects.forEach((aggregateObject) => {
          if (!aggregateObjects
            .find((aggObject) => aggObject.aggregateName === aggregateObject.aggregateName)) {
            aggregateObjects.push(aggregateObject);
          }
        });
      }
    }
  });

  // Return the includes array, aggregates, and aggregateObjects
  return {
    includes,
    aggregates,
    aggregateObjects,
  };
};

//----------------------------------------------------

/**
 * Sets the model attributes as flagged.
 * @param {string} flagName - The name of the flag.
 * @param {Model} model - The model to update.
 * @param {string} prefix - The prefix for attribute names.
 * @param {object} options - Additional options for the update.
 * @param {number} modelId - The ID of the model instance to update.
 * @returns {Promise<void[]>} A promise that resolves when all updates are complete.
 */
const setModelAttributesAsFlagged = async (
  flagName,
  model,
  prefix,
  options,
  modelId,
) => {
  // Find flagged models from the given model
  const {
    includes, // Related models to include in the query
    aggregates, // Aggregated attributes to select in the query
    aggregateObjects, // Objects containing information about aggregated models
  } = findFlaggedModelsFromModel(
    flagName,
    model,
    prefix,
  );

  // Fetch the foiaable data sets and selected aggregates for the given modelId
  const [foiaableDataSets] = await model.findAll({
    attributes: [
      ['id', `${prefix}Id`], // Include the ID with the specified prefix
      ...aggregates, // Include the selected aggregates
    ],
    where: { id: modelId },
    includes,
    group: ['id'],
    raw: true,
    transaction: options.transaction,
  });

  // Update each aggregate model with isFoiaable flag based on the corresponding dataset ID
  return Promise.all(aggregateObjects.map(({
    aggregateModel,
    aggregateName,
  }) => aggregateModel.update(
    { isFoiaable: true },
    {
      where: { id: foiaableDataSets[aggregateName] },
      transaction: options.transaction,
      individualHooks: true,
    },
  )));
};

/**
 * Sets the model attributes as "foiaable" by calling the setModelAttributesAsFlagged function.
 * @param {object} model - The model object.
 * @param {string} prefix - The prefix for the attributes.
 * @param {object} options - The options for setting the attributes.
 * @param {string} modelId - The ID of the model.
 * @returns {Promise<void>} - A promise that resolves when the attributes are set.
 */
const setModelAttributesAsFoiaable = async (
  model,
  prefix,
  options,
  modelId,
  // Call the setModelAttributesAsFlagged function to set the attributes as "foiaable"
) => setModelAttributesAsFlagged(
  'isFoiaable',
  model,
  prefix,
  options,
  modelId,
);

/**
 * Sets the model attributes as referenced.
 * @param {object} model - The model object.
 * @param {string} prefix - The prefix for the attributes.
 * @param {object} options - The options object.
 * @param {string} modelId - The ID of the model.
 * @returns {Promise<void>} - A promise that resolves when the attributes are set.
 */
const setModelAttributesAsReferenced = async (
  model,
  prefix,
  options,
  modelId,
) => setModelAttributesAsFlagged(
  'isReferenced', // Flag to set the attributes as referenced
  model, // The model object
  prefix, // The prefix for the attributes
  options, // The options object
  modelId, // The ID of the model
);

//----------------------------------------------------

/**
 * Retrieves the foiaable columns for a given model.
 * @param {object} models - The object containing all the Sequelize models.
 * @param {object} model - The Sequelize model for which to retrieve the foiaable columns.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of objects representing
 * the foiaable columns.
 */
const getFoiaableColumnsForModel = async (
  models,
  model,
) => models.Foiaable.findAll({
  attributes: ['column'], // Selects only the 'column' attribute from the result set
  // Filters the result set based on the 'table' attribute matching the model's table name
  where: { table: model.tableName },
  raw: true, // Returns raw data instead of Sequelize instances
});

/**
 * Checks if there is an attempt to change foiaable columns on a model instance.
 * @param sequelize - The Sequelize instance.
 * @param instance - The model instance being checked.
 * @param options - Additional options for the check.
 */
const checkForAttemptToChangeFoiaableValue = async (
  sequelize,
  instance,
  options,
) => {
  // Check if the instance has the 'isFoiaable' attribute set to true
  if (instance.get('isFoiaable')) {
    // Get the list of foiaable columns for the model
    const foiaableColumns = await getFoiaableColumnsForModel(
      sequelize.models,
      instance.constructor,
    );

    // Get the list of updated columns on the instance
    const updatedColumns = instance.changed();

    // Find any updated column that matches a foiaable column
    const updatedFoiaableColumns = updatedColumns
      .find((column) => foiaableColumns.includes(column));

    // If there are updated foiaable columns, throw an error
    if (updatedFoiaableColumns && updatedFoiaableColumns.length > 0) {
      throw new Error(`Cannot update foiaable columns (${updatedFoiaableColumns.join(',')}) on table ${instance.constructor.tableName}`);
    }
  }
};

/**
 * Checks if a record is foiaable and throws an error if it is.
 * @param sequelize - The Sequelize instance.
 * @param instance - The instance of the model.
 * @param options - The options for the operation.
 */
const checkForAttemptToRemoveFoiaableValue = async (
  sequelize,
  instance,
  options,
) => {
  // Check if the record is foiaable
  if (instance.get('isFoiaable')) {
    // Throw an error if the record is foiaable
    throw new Error(`Cannot remove foiaable record in table ${instance.constructor.tableName}`);
  }
};

//----------------------------------------------------

export {
  autoPopulateIsFlagged,
  autoPopulateIsFoiaable,
  autoPopulateIsReferenced,
  recalculateIsFlagged,
  recalculateIsFoiaable,
  recalculateIsReferenced,
  findFlaggedModelsFromModel,
  setModelAttributesAsFlagged,
  setModelAttributesAsFoiaable,
  setModelAttributesAsReferenced,
  getFoiaableColumnsForModel,
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
};
