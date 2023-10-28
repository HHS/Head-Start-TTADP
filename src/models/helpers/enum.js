// Function to get the column definitions for enum columns in a Sequelize model
const getEnumColumnDefinitions = (sequelize, model) => Object
  .entries(model.rawAttributes)
  .filter(([name, value]) => value.type.key === sequelize.constructor.DataTypes.ENUM.key)
  .reduce((columns, [columnName, columnDef]) => ({
    ...columns,
    [columnName]: columnDef,
  }), {});

// Function to get the valid values for an enum column definition
const getValidValues = (columnDef) => [
  ...(columnDef?.type?.values || []),
  ...(columnDef?.allowNull ? [null] : []),
];

const isEnumColumn = (enumColumns) => (change) => Object.keys(enumColumns).includes(change);

const setValidValueOrThrowError = (instance, enumColumns) => (change) => {
  const columnDef = enumColumns[change];
  const validValues = getValidValues(columnDef);
  const currentValue = instance[change];

  if (!validValues.includes(currentValue)) {
    if ((currentValue === null || currentValue.trim() === '') && columnDef.allowNull) {
      instance.set(change, null);
    } else {
      throw new Error(`Invalid value of '${currentValue}' passed for ${change}`);
    }
  }
};

const validateChangedOrSetEnums = (sequelize, instance) => {
  const model = instance.constructor;
  const enumColumns = getEnumColumnDefinitions(sequelize, model);
  const changed = instance.changed();

  changed
    .filter(isEnumColumn(enumColumns))
    .forEach(setValidValueOrThrowError(instance, enumColumns));
};

export {
  getEnumColumnDefinitions,
  getValidValues,
  validateChangedOrSetEnums,
};
