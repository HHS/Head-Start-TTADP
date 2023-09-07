/**
 * Converts a PascalCase string to camelCase.
 *
 * @param {string} input - The PascalCase string to convert.
 * @returns {string} - The converted camelCase string.
 */
const pascalToCamelCase = (input) => (input
  ? input[0].toLowerCase() + input.slice(1)
  : input);

/**
 * Converts a camelCase string to PascalCase.
 *
 * @param {string} input - The camelCase string to convert.
 * @returns {string} - The converted PascalCase string.
 */
const camelToPascalCase = (input) => (input
  ? input[0].toUpperCase() + input.slice(1)
  : input);

/**
 * Function to make a word plural based on specific rules.
 * @param {string} word - The word to be made plural.
 * @returns {string} - The plural form of the word.
 */
const makePlural = (word) => {
  // Define the rules for making words plural as a hash
  const pluralRulesEndingIn = {
    s: { regex: /(s)$/, ending: '$1es' }, // Words ending in "s" become "es"
    consonantY: { regex: /([^aeiou])y$/, ending: '$1ies' }, // Words ending in consonant + "y" become "ies"
    default: { ending: 's' }, // Default rule: just add "s" to the end of the word
  };

  // Apply the plural rules to the word using a switch statement
  switch (true) {
    case pluralRulesEndingIn.s.regex.test(word): // Check if word ends with "s"
      return word.replace(
        pluralRulesEndingIn.s.regex,
        pluralRulesEndingIn.s.ending,
      );
    case pluralRulesEndingIn.consonantY.regex.test(word): // Check if word ends with consonant + "y"
      return word.replace(
        pluralRulesEndingIn.consonantY.regex,
        pluralRulesEndingIn.consonantY.ending,
      );
    default: // Default rule: just add "s" to the end of the word
      return word + pluralRulesEndingIn.default.ending;
  }
};

/**
 * Generates an association between two objects in JavaScript.
 *
 * @param {import('sequelize').Model} from - The object to associate from.
 * @param {import('sequelize').Model} to - The object to associate to.
 * @param {string} type - The type of association to create.
 * @param {string} foreignKey - The foreign key to use for the association.
 * @param {string} as - The name of the association.
 * @param {import('sequelize').Model} through - The intermediate table to use for a many-to-many association.
 * @param {string} otherKey - The foreign key on the `through` table for a many-to-many association.
 * @returns {void}
 */
const generateAssociation = (
  from,
  to,
  type,
  foreignKey,
  as,
  through,
  otherKey,
  // Create the association between the `from` and `to` objects using the specified `type`
  // and options such as `foreignKey`, `as`, `through`, and `otherKey`.
) => {
  console.log('####', from, to, as, through);
  from[type](to, {
    foreignKey,
    as,
    ...(through && { through, otherKey }),
  });
  console.log('####', from, to, as, through);
};

/**
 * Generates an association pair between two Sequelize models.
 *
 * @param {import('sequelize').Model} from - The source model.
 * @param {import('sequelize').Model} to - The target model.
 * @param {string} type1 - The type of association from the source model to the target model.
 * @param {string} type2 - The type of association from the target model to the source model.
 * @param {string} foreignKey - The foreign key used for the association.
 * @param {string} as1 - The alias for the association from the source model to the target model.
 * @param {string} as2 - The alias for the association from the target model to the source model.
 * @param {import('sequelize').Model|string} through - The intermediary model used for a many-to-many association.
 * @param {string} otherKey - The foreign key used in the opposite direction of the association.
 */
const generateAssociationPair = (
  from,
  to,
  type1,
  type2,
  foreignKey,
  as1,
  as2,
  through,
  otherKey,
) => {
  console.log('generateAssociationPair:',{
    from,
    to,
    type1,
    type2,
    foreignKey,
    as1,
    as2,
    through,
    otherKey,
  });
  const asSuffix = through
    ? `For${through.name}`
    : '';
  // Generate association from source model to target model
  generateAssociation(
    from,
    to,
    type1,
    foreignKey,
    // Use singular or plural alias based on association type
    type1 === 'belongsTo' || type1 === 'hasOne'
      ? `${as1}${asSuffix}`
      : makePlural(`${as1}${asSuffix}`),
    through,
    otherKey,
  );

  // Generate association from target model to source model
  generateAssociation(
    to,
    from,
    type2,
    // Use foreign key or other key if provided
    otherKey || foreignKey,
    // Use singular or plural alias based on association type
    type2 === 'belongsTo' || type2 === 'hasOne'
      ? `${as2}${asSuffix}`
      : makePlural(`${as2}${asSuffix}`),
    through,
    // Use other key or foreign key if other key provided
    otherKey ? foreignKey : otherKey,
  );
};

/**
 * Finds the foreign key in the source model that references the target model.
 *
 * @param {object} sourceModelAttributes - The source model object.
 * @param {import('sequelize').Model|string} targetModel - The target model object.
 * @returns {string|null} - The name of the foreign key if found, otherwise null.
 */
const locateForeignKey = (sourceModelAttributes, targetModel) => {
  // Get the table name of the target model
  const targetTable = targetModel.getTableName();
  const foreignKeys = [];
  // Iterate over the attributes of the source model
  sourceModelAttributes.forEach(([key, value]) => {
    // Check if the attribute has a reference to the target table
    if (value === targetTable) {
      foreignKeys.push(key); // Return the name of the foreign key
    }
  });
  console.log('locateForeignKey:', {
    sourceModelAttributes,
    targetModel,
    targetTable,
    foreignKeys,
  });
  return foreignKeys.length
    ? foreignKeys[0]
    : null; // No foreign key found
};

/**
 * Returns the association settings for a given model.
 *
 * @param {import('sequelize').Model} model - The model object.
 * @param {string} suffix - The suffix to be added to the model's name.
 * @param {number} index - The index of the scope in the additionalData object.
 * @param {Object} additionalData - Additional data object containing scopes and as property.
 * @param {string} [suffixPrefix=''] - The prefix to be added to the suffix.
 * @returns {Object} - The association settings object with model, as, and suffix properties.
 */
const getAssociationSettings = (
  model,
  suffix,
  index,
  additionalData,
  suffixPrefix = '',
) => {
  const usableScope = (additionalData?.scopes?.[index - 1])
    ? additionalData.scopes[index - 1]
    : additionalData?.scope;
  // Check if additionalData has a scope at the specified index
  const usableModel = (usableScope
    && (Object.keys(model.options.scopes).includes(usableScope?.method?.[0] || usableScope)
      || usableScope === 'default'))
    ? model.scope(usableScope) // Use the scoped model if available
    : model; // Use the original model if no scopes are provided

  // Check if additionalData has an 'as' property
  const usableAs = (additionalData?.as)
    ? additionalData.as // Use the provided 'as' value
    : pascalToCamelCase(model.name); // Convert the model's name to camel case and use it as 'as'

  // Check if suffix is provided
  const usableSuffix = suffix
    ? `${suffixPrefix}${camelToPascalCase(suffix)}` // Add the prefix to the suffix if provided
    : null; // Set the suffix to null if not provided

  return {
    model: usableModel,
    as: usableAs,
    suffix: usableSuffix,
  };
};

/**
 *
 * @param {import('sequelize').Model} junctionModel
 * @param {import('sequelize').Model[]} associatedModels
 * @param {{ as?: string, suffixes?: string[], scope?: {}, scopes?: {}[], models?: { as?: string, suffixes?: string[], scope?: {}, scopes?: {}[] }[] }|null} additionalData
 */
const generateJunctionTableAssociations = (
  junctionModel,
  associatedModels,
  additionalData = null,
) => {
  console.log('@@@', junctionModel, additionalData && additionalData?.suffixes != null);
  const junctionModelAttributes = Object.entries(junctionModel.rawAttributes)
    .map(([key, value]) => ([key, value?.references?.model?.tableName]));
    console.log(junctionModelAttributes);
  [
    null,
    ...(additionalData?.suffixes
      ? additionalData.suffixes
      : []),
  ].forEach((suffix, suffixIndex) => {
    const {
      model: centerModel,
      as: centerAs,
      suffix: centerSuffix,
    } = getAssociationSettings(
      junctionModel,
      suffix,
      suffixIndex,
      additionalData,
      'As',
    );

    associatedModels.forEach((model, modelIndex) => {
      [
        null,
        ...(additionalData?.models?.[modelIndex]?.suffixes
          ? additionalData.models[modelIndex].suffixes
          : []),
      ].forEach((modelSuffix, modelSuffixIndex) => {
        const {
          model: associatedModel,
          as: associatedModelAs,
          suffix: associatedModelSuffix,
        } = getAssociationSettings(
          associatedModels[modelIndex],
          camelToPascalCase(modelSuffix),
          modelSuffixIndex,
          additionalData?.models?.[modelIndex],
          'For',
        );
        const associatedModelForeignKey = locateForeignKey(junctionModelAttributes, model);
        console.log('^^^^^', { associatedModel, associatedModelAs, associatedModelSuffix, associatedModelForeignKey });
        if (associatedModelForeignKey !== null) {
          generateAssociationPair(
            centerModel,
            associatedModel,
            'belongsTo',
            'hasMany',
            associatedModelForeignKey,
            `${associatedModelAs}${associatedModelSuffix || ''}${centerSuffix || ''}`,
            `${centerAs}${associatedModelSuffix || ''}${centerSuffix || ''}`,
          );

          associatedModels
            .slice(modelIndex)
            .forEach((otherModel, otherModelIndex) => {
              if (model === otherModel) return;
              console.log({ modelIndex, otherModelIndex });
              [
                null,
                ...(additionalData?.models?.[modelIndex + otherModelIndex]?.suffixes !== undefined
                  ? additionalData.models[modelIndex + otherModelIndex].suffixes
                  : []),
              ].forEach((otherModelSuffix, otherModelSuffixIndex) => {
                console.log('$$$$', junctionModel, associatedModels, otherModel, associatedModels[modelIndex + otherModelIndex], modelIndex, otherModelIndex);
                const {
                  model: otherAssociatedModel,
                  as: otherAssociatedModelAs,
                  suffix: otherAssociatedModelSuffix,
                } = getAssociationSettings(
                  associatedModels[modelIndex + otherModelIndex],
                  otherModelSuffix,
                  otherModelSuffixIndex,
                  additionalData?.models?.[modelIndex + otherModelIndex],
                  'For',
                );
                const otherAssociatedModelForeignKey = locateForeignKey(junctionModelAttributes, otherModel);

                if (otherAssociatedModelForeignKey !== null) {
                  generateAssociationPair(
                    associatedModel,
                    otherAssociatedModel,
                    'belongsToMany',
                    'belongsToMany',
                    associatedModelForeignKey,
                    `${otherAssociatedModelAs}${otherAssociatedModelSuffix || ''}${associatedModelSuffix || ''}${centerSuffix || ''}`,
                    `${associatedModelAs}${associatedModelSuffix || ''}${otherAssociatedModelSuffix || ''}${centerSuffix || ''}`,
                    centerModel,
                    otherAssociatedModelForeignKey,
                  );
                }
              });
            });
        }
      });
    });
  });
  console.log(junctionModel, junctionModel.associations);
  console.log('---------------------------------------------------------------------');
};

/**
 * Automatically generates junction table associations for a given junction model.
 *
 * @param {object} junctionModel - The junction model object.
 * @param {array} models - An array of all the models in the application.
 * @returns {array} - An array of associated models for the junction table.
 */
const automaticallyGenerateJunctionTableAssociations = (
  junctionModel,
  models = {},
) => {
  // Filter the raw attributes of the junction model to find only those that have a reference to
  // another model's table name
  const associatedModels = Object.entries(junctionModel.rawAttributes)
    .filter(([key, value]) => value?.references?.model?.tableName !== null)
    // Map each filtered attribute to its associated model by finding the model with the matching
    // table name
    .map(([key, value]) => Object.values(models)
      .find((model) => model.getTableName() === value?.references?.model?.tableName))
    .filter((model) => model);

  if (!associatedModels || associatedModels.length === 0) {
    console.log(Object.entries(junctionModel.rawAttributes).map(([key, value]) => ([key, value?.references, value?.references?.model?.tableName])));
    //filter out the keys starting with 'Z'
    console.log(Object.entries(models)
      .map(([key, value]) => ([key, value.getTableName()]))
      .filter(([key, value]) => !key.startsWith('Z')));
    throw new Error('no tables in models');
  }

  // Generate junction table associations using the junction model and associated models
  return generateJunctionTableAssociations(junctionModel, associatedModels);
};

export {
  pascalToCamelCase,
  camelToPascalCase,
  generateAssociation,
  generateAssociationPair,
  generateJunctionTableAssociations,
  automaticallyGenerateJunctionTableAssociations,
};
