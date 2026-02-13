// Function to get the column definitions for enum columns in a Sequelize model
const getEnumColumnDefinitions = (sequelize, model) =>
  Object.entries(model.rawAttributes)
    .filter(([name, value]) => value.type.key === sequelize.constructor.DataTypes.ENUM.key)
    .reduce(
      (columns, [columnName, columnDef]) => ({
        ...columns,
        [columnName]: columnDef,
      }),
      {}
    )

// Function to get the valid values for an enum column definition
const getValidValues = (columnDef) => [...(columnDef?.type?.values || []), ...(columnDef?.allowNull ? [null] : [])]

// This function checks if a given column is an enum column
const isEnumColumn = (enumColumns) => (change) => Object.keys(enumColumns).includes(change)

// This function sets a valid value for a given column or throws an error if the value is invalid
const setValidValueOrThrowError = (instance, enumColumns) => (change) => {
  const columnDef = enumColumns[change]
  const validValues = getValidValues(columnDef)
  const currentValue = instance[change]

  if (!validValues.includes(currentValue)) {
    if ((currentValue === null || currentValue.trim() === '') && columnDef.allowNull) {
      instance.set(change, null)
    } else {
      throw new Error(`Invalid value of '${currentValue}' passed for ${change}`)
    }
  }
}

/**
 * This function validates changed or sets enums for a Sequelize instance.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The Sequelize model instance.
 */
const validateChangedOrSetEnums = (sequelize, instance) => {
  const model = instance.constructor
  const enumColumns = getEnumColumnDefinitions(sequelize, model)
  const changed = instance?.changed() || []

  // Filter the changed columns to only include enum columns and perform validation or
  // setting of valid values
  changed.filter(isEnumColumn(enumColumns)).forEach(setValidValueOrThrowError(instance, enumColumns))
}

export { getEnumColumnDefinitions, getValidValues, isEnumColumn, setValidValueOrThrowError, validateChangedOrSetEnums }
