/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataTypes, type Model } from 'sequelize'
import merge from 'deepmerge'
import { isObject } from './dataObjectUtils'

// Define a custom type SequelizeDataTypes that represents the available data types in Sequelize
type SequelizeDataTypes =
  | typeof DataTypes.ABSTRACT // Abstract data type
  | typeof DataTypes.STRING // String data type
  | typeof DataTypes.CHAR // Character data type
  | typeof DataTypes.TEXT // Text data type
  | typeof DataTypes.NUMBER // Number data type
  | typeof DataTypes.TINYINT // Tiny integer data type
  | typeof DataTypes.SMALLINT // Small integer data type
  | typeof DataTypes.MEDIUMINT // Medium integer data type
  | typeof DataTypes.INTEGER // Integer data type
  | typeof DataTypes.BIGINT // Big integer data type
  | typeof DataTypes.FLOAT // Float data type
  | typeof DataTypes.REAL // Real number data type
  | typeof DataTypes.DOUBLE // Double precision float data type
  | typeof DataTypes.DECIMAL // Decimal data type
  | typeof DataTypes.BOOLEAN // Boolean data type
  | typeof DataTypes.TIME // Time data type
  | typeof DataTypes.DATE // Date data type
  | typeof DataTypes.DATEONLY // Date without time data type
  | typeof DataTypes.HSTORE // Hstore data type
  | typeof DataTypes.JSON // JSON data type
  | typeof DataTypes.JSONB // JSONB data type
  | typeof DataTypes.NOW // Current timestamp data type
  | typeof DataTypes.BLOB // Binary large object data type
  | typeof DataTypes.RANGE // Range of values data type
  | typeof DataTypes.UUID // UUID data type
  | typeof DataTypes.UUIDV1 // Version 1 UUID data type
  | typeof DataTypes.UUIDV4 // Version 4 UUID data type
  | typeof DataTypes.VIRTUAL // Virtual data type
  | typeof DataTypes.ENUM // Enumerated data type
  | typeof DataTypes.ARRAY // Array data type
  | typeof DataTypes.GEOMETRY // Geometry data type
  | typeof DataTypes.GEOGRAPHY // Geography data type
  | typeof DataTypes.CIDR // CIDR (Classless Inter-Domain Routing) data type
  | typeof DataTypes.INET // IP address data type
  | typeof DataTypes.MACADDR // MAC (Media Access Control) address data type
  | typeof DataTypes.CITEXT // Case-insensitive text data type
  | typeof DataTypes.TSVECTOR // Text search vector data type

// Define the mapping between Sequelize data types and TypeScript data types
const dataTypeMapping = {
  [DataTypes.ABSTRACT.key]: undefined,
  [DataTypes.STRING.key]: 'string',
  [DataTypes.CHAR.key]: 'string',
  [DataTypes.TEXT.key]: 'string',
  [DataTypes.NUMBER.key]: 'number',
  [DataTypes.TINYINT.key]: 'number',
  [DataTypes.SMALLINT.key]: 'number',
  [DataTypes.MEDIUMINT.key]: 'number',
  [DataTypes.INTEGER.key]: 'number',
  [DataTypes.BIGINT.key]: 'number',
  [DataTypes.FLOAT.key]: 'number',
  [DataTypes.REAL.key]: 'number',
  [DataTypes.DOUBLE.key]: 'number',
  [DataTypes.DECIMAL.key]: 'number',
  NUMERIC: 'number', // not in DataTypes but seen in models return values
  [DataTypes.BOOLEAN.key]: 'boolean',
  [DataTypes.TIME.key]: 'string',
  [DataTypes.DATE.key]: 'string',
  [DataTypes.DATEONLY.key]: 'string',
  TIMESTAMP: 'string', // not in DataTypes but seen in models return values
  'TIMESTAMP WITH TIME ZONE': 'string', // not in DataTypes but seen in models return values
  [DataTypes.HSTORE.key]: undefined,
  [DataTypes.JSON.key]: 'object',
  [DataTypes.JSONB.key]: 'object',
  [DataTypes.NOW.key]: undefined,
  [DataTypes.BLOB.key]: undefined,
  [DataTypes.RANGE.key]: undefined,
  [DataTypes.UUID.key]: 'string',
  [DataTypes.UUIDV1.key]: 'string',
  [DataTypes.UUIDV4.key]: 'string',
  [DataTypes.VIRTUAL.key]: undefined,
  [DataTypes.ENUM.key]: 'string',
  [DataTypes.ARRAY.key]: undefined,
  [DataTypes.GEOMETRY.key]: 'object',
  [DataTypes.GEOGRAPHY.key]: 'object',
  [DataTypes.CIDR.key]: 'string',
  [DataTypes.INET.key]: 'string',
  [DataTypes.MACADDR.key]: 'string',
  [DataTypes.CITEXT.key]: undefined,
  [DataTypes.TSVECTOR.key]: undefined,
  // Add more mappings as needed
}

/**
 * Retrieves the model for a given table name from a database object.
 *
 * @param db - The database object containing the models.
 * @param tableName - The name of the table for which to retrieve the model.
 * @returns The model corresponding to the given table name.
 * @throws If no model is found for the given table name.
 */
const modelForTable = (db, tableName) => {
  const model = Object.values(db.sequelize.models).find((m: { getTableName }) => m.getTableName() === tableName)
  if (!model) {
    throw new Error(`Unable to find table for '${tableName}'`)
  }
  return model
}

/**
 * Retrieves column information for a given model.
 * @param model - The model to retrieve column information from.
 * @returns An array of objects representing the columns, each containing the column name,
 * data type, and whether it allows null values.
 */
const getColumnInformation = async (
  model
): Promise<
  {
    columnName: string
    dataType
    allowNull: boolean
  }[]
> => {
  if (!model.description) {
    // cache the response to the model as this is a request to the database
    // eslint-disable-next-line no-param-reassign
    model.description = await model.describe()
  }

  // Retrieve the table details using the describe() method of the model
  const tableDetails: {
    [key: string]: {
      type
      allowNull: boolean
    }
  } = model.description

  // Map over the entries of the tableDetails object to transform them into an array of
  // column objects
  const columns = Object.entries(tableDetails).map(([columnName, columnDetails]) => ({
    columnName, // Store the column name
    dataType: columnDetails.type, // Store the data type of the column
    allowNull: columnDetails.allowNull, // Store whether the column allows null values
  }))

  return columns // Return the array of column objects
}

/**
 * Retrieves the column names from a Sequelize model for a specific data type.
 * @param model - The Sequelize model to retrieve column names from.
 * @param type - The data type to filter the columns by.
 * @returns An array of column names that match the specified data type.
 */
const getColumnNamesFromModelForType = async (model: typeof Model, type: SequelizeDataTypes): Promise<string[]> => {
  // Retrieve the column information for the given model
  const modelData = await getColumnInformation(model)

  // Filter the model data to only include columns with the specified data type
  return modelData.filter(({ dataType }) => dataType === type).map(({ columnName }) => columnName)
}

/**
 * Filters the given data object based on the column information of a model.
 * @param data - The data object to filter.
 * @param model - The model class representing the columns.
 * @returns An object with two properties: matched and unmatched.
 */
const filterDataToModel = async (
  data: Record<string, any>,
  model
): Promise<{
  matched: Record<string, any>
  unmatched: Record<string, any>
}> => {
  // Retrieve the column information for the model
  const modelData = await getColumnInformation(model)

  return Object.entries(data).reduce(
    (acc, [key, value]) => {
      // Find the matching column in the model data
      const matchColumn = modelData.find((md) => md.columnName === key)
      const neededType = dataTypeMapping[matchColumn?.dataType?.key || matchColumn?.dataType]
      const valueType = value instanceof Date ? 'string' : typeof value
      if (!!matchColumn && ((value === null && matchColumn?.allowNull) || valueType === neededType)) {
        // If the value matches the column criteria, add it to the matched object
        acc.matched[key] = value
      } else if (neededType === 'string' && valueType === 'number') {
        // If the value matches the column criteria, add it to the matched object
        acc.matched[key] = `${value}`
      } else if (neededType === 'boolean' && valueType === 'number' && [0, 1].includes(value)) {
        // If the value matches the column criteria, add it to the matched object
        acc.matched[key] = Boolean(value)
      } else {
        // Otherwise, add it to the unmatched object
        acc.unmatched[key] = value
      }

      return acc
    },
    { matched: {}, unmatched: {} }
  )
}

/**
 * This function includes a model and its associated data based on the provided include function.
 * It retrieves all records that match the given conditions.
 *
 * @param includeFunc - The function that defines the model and its associations to be included.
 * @param moreWhere - Additional conditions to filter the records.
 * @param funcArgs - Arguments to be passed to the include function.
 * @param attributes - Attributes to be selected from the records.
 * @returns A promise that resolves to an array of matching records.
 */
const includeToFindAll = async (includeFunc, moreWhere, funcArgs = null, attributes = null) => {
  // Destructure the properties 'as', 'model', 'where', and other arguments from the result of
  // calling the include function
  const { as, model, where, ...args } = funcArgs ? includeFunc(...funcArgs) : includeFunc()

  // Find all records of the model, applying the merged 'where' condition and any additional
  // conditions
  return model.findAll({
    where: merge(where, moreWhere),
    ...(attributes && { attributes }),
    ...args,
  })
}

/**
 * Transforms a nested object or array of objects by recursively stripping out
 * Sequelize model instance metadata and retaining only the raw data values.
 * This function is intended to be used with raw Sequelize query results.
 *
 * @param data - An object or array of objects potentially containing Sequelize
 *               model instance properties such as `dataValues` and metadata.
 *
 * @returns A new object or array of objects similar to the input `data` but
 *          with Sequelize-specific properties removed. The structure of the
 *          input is preserved, and only the raw data values are retained.
 *
 * @remarks
 * This function assumes that Sequelize model instances have a `dataValues`
 * property containing the raw data, as well as other Sequelize-specific
 * metadata properties. These metadata properties are excluded from the output.
 */
const nestedRawish = (data: { [key: string]: any } | { [key: string]: any }[]): { [key: string]: any } | { [key: string]: any }[] => {
  if (Array.isArray(data)) {
    return data.map((datum) => nestedRawish(datum))
  }

  if (isObject(data) && data?.dataValues) {
    const { dataValues, _previousDataValues: previousDataValues, uniqno, _changed: changed, _options: options, isNewRecord, ...includes } = data

    const result = {
      ...dataValues,
    }

    Object.keys(includes).forEach((key) => {
      result[key] = nestedRawish(includes[key])
    })

    return result
  }

  return data
}

export { dataTypeMapping, modelForTable, getColumnInformation, getColumnNamesFromModelForType, includeToFindAll, filterDataToModel, nestedRawish }
