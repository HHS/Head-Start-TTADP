import { Op, Sequelize } from 'sequelize';

const autoPopulateIsFlagged = (
  flagName: string,
  sequelize,
  instance,
  options,
): void => {
  // Check if flagName is undefined or null
  if (instance[flagName] === undefined
    || instance[flagName] === null) {
    // Set flagName to false
    instance.set(flagName, false);

    // Check if flagName is not included in the fields array
    if (!options.fields.includes(flagName)) {
      // Add flagName to the fields array
      options.fields.push(flagName);
    }
  }
};

const autoPopulateIsFoiaable = (
  sequelize,
  instance,
  options,
): void => autoPopulateIsFlagged(
  'isFoiaable',
  sequelize,
  instance,
  options,
);

const autoPopulateIsReferenced = (
  sequelize,
  instance,
  options,
): void => autoPopulateIsFlagged(
  'isReferenced',
  sequelize,
  instance,
  options,
);

//----------------------------------------------------

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
  const reportWhere = {
    model: sequelize.models.Report,
    as: 'reports',
    attributes: [],
    through: {
      attributes: [],
    },
    required: false,
    includes: [
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

  const deltas = await model.findAll({
    attributes: [
      'id',
      [
        sequelize.literal('COUNT(DISTINCT "Reports".id) + COUNT(DISTINCT "ActivityReports".id) > 0'),
        flagName,
      ],
    ],
    includes: [
      (reportIntermediateModel)
        ? {
          model: reportIntermediateModel,
          as: reportAs,
          attributes: [],
          required: false,
          includes: [reportWhere],
        }
        : reportWhere,
      (activityReportIntermediateModel)
        ? {
          model: activityReportIntermediateModel,
          as: activityReportIntermediateAs,
          attributes: [],
          required: false,
          includes: [activityReportWhere],
        }
        : activityReportWhere,
    ],
    where: {
      id: ids,
    },
    group: [`${model.getTableName()}."id"`],
    having: {
      [flagName]: {
        [Op.not]: sequelize.literal('COUNT(DISTINCT "Reports".id) + COUNT(DISTINCT "ActivityReports".id) > 0'),
      },
    },
    raw: true,
    transaction: options.transaction,
  });

  const { nowFlagged, clearFlagged } = deltas.reduce((acc, delta) => {
    if (delta[flagName]) {
      acc.nowFlagged.push(delta.id);
    } else {
      acc.clearFlagged.push(delta.id);
    }
    return acc;
  }, { nowFlagged: [], clearFlagged: [] });

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

const recalculateIsFoiaable = async (
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

const setModelAttributesAsFlagged = async (
  flagName,
  model,
  prefix,
  options,
  modelId,
) => {
  const {
    includes,
    aggregates,
    aggregateObjects,
  } = findFlaggedModelsFromModel(
    flagName,
    model,
    prefix,
  );

  const [foiaableDataSets] = await model.findAll({
    attributes: [
      ['id', `${prefix}Id`],
      ...aggregates,
    ],
    where: { id: modelId },
    includes,
    group: ['id'],
    raw: true,
    transaction: options.transaction,
  });

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

const setModelAttributesAsFoiaable = async (
  model,
  prefix,
  options,
  modelId,
) => setModelAttributesAsFlagged(
  'isFoiaable',
  model,
  prefix,
  options,
  modelId,
);

const setModelAttributesAsReferenced = async (
  model,
  prefix,
  options,
  modelId,
) => setModelAttributesAsFlagged(
  'isReferenced',
  model,
  prefix,
  options,
  modelId,
);

//----------------------------------------------------

const getFoiaableColumnsForModel = async (
  models,
  model,
) => models.Foiaable.findAll({
  attributes: ['column'],
  where: { table: model.getTableName() },
  raw: true,
});

const checkForAttemptToChangeFoiaableValue = async (
  sequelize,
  instance,
  options,
) => {
  const foiaableColumns = await getFoiaableColumnsForModel(sequelize.models, instance.constructor);

  const updatedColumns = instance.changed();

  // Check if any updated column matches the foiaable columns
  const updatedFoiaableColumns = updatedColumns.find((column) => foiaableColumns.includes(column));

  if (updatedFoiaableColumns && updatedFoiaableColumns.length > 0) {
    throw new Error(`Cannot update foiaable columns (${updatedFoiaableColumns.join(',')}) on table ${instance.constructor.getTableName()}`);
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
};
