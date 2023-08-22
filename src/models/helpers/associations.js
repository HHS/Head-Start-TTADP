/**
 * Converts a PascalCase string to camelCase.
 *
 * @param {string} input - The PascalCase string to convert.
 * @returns {string} - The converted camelCase string.
 */
const pascalToCamelCase = (input) => input[0].toLowerCase() + input.slice(1);

/**
 * Converts a camelCase string to PascalCase.
 *
 * @param {string} input - The camelCase string to convert.
 * @returns {string} - The converted PascalCase string.
 */
const camelToPascalCase = (input) => input[0].toUpperCase() + input.slice(1);

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
) => from[type](to, {
  foreignKey,
  as,
  ...(through && { through, otherKey }),
});

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
  // Generate association from source model to target model
  generateAssociation(
    from,
    to,
    type1,
    foreignKey,
    // Use singular or plural alias based on association type
    type1 === 'belongsTo' || type1 === 'hasOne'
      ? as1
      : `${as1}s`,
    through,
    otherKey,
  );

  // Generate association from target model to source model
  generateAssociation(
    to,
    from,
    type2,
    // Use foreign key or other key if provided
    otherKey ? otherKey : foreignKey,
    // Use singular or plural alias based on association type
    type2 === 'belongsTo' || type2 === 'hasOne'
      ? as2
      : `${as2}s`,
    through,
    // Use other key or foreign key if other key provided
    otherKey ? foreignKey : otherKey,
  );
};


/**
 * Finds the foreign key in the source model that references the target model.
 *
 * @param {import('sequelize').Model|string} sourceModel - The source model object.
 * @param {import('sequelize').Model|string} targetModel - The target model object.
 * @returns {string|null} - The name of the foreign key if found, otherwise null.
 */
const locateForeignKey = (sourceModel, targetModel) => {
  // Get the table name of the target model
  const targetTable = targetModel.getTableName();

  // Iterate over the attributes of the source model
  for (const [key, value] of Object.entries(sourceModel.rawAttributes)) {
    // Check if the attribute has a reference to the target table
    if (value?.references?.model?.tableName === targetTable) {
      return key; // Return the name of the foreign key
    }
  }

  return null; // No foreign key found
};

const generateJunctionTableAssociations = (
  centerModel,
  models,
) => {
  const centerAs = pascalToCamelCase(centerModel.name);

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const modelAs = pascalToCamelCase(model.name);
    const foreignKey = locateForeignKey(centerModel, model);

    if (foreignKey !== null) {
      generateAssociationPair(
        centerModel,
        model,
        'belongsTo',
        'hasMany',
        foreignKey,
        modelAs,
        centerAs,
      );

      for (let j = i + 1; j < models.length; j++) {
        const otherModel = models[j];
        const otherModelAs = pascalToCamelCase(otherModel.name);
        const otherForeignKey = locateForeignKey(model, otherModel);

        if (otherForeignKey !== null) {
          generateAssociationPair(
            model,
            otherModel,
            'belongsToMany',
            'belongsToMany',
            foreignKey,
            otherModelAs,
            modelAs,
            centerModel,
            otherForeignKey,
          );
        }
      }
    }
  }
};

export {
  pascalToCamelCase,
  camelToPascalCase,
  generateAssociation,
  generateAssociationPair,
  generateJunctionTableAssociations,
};
