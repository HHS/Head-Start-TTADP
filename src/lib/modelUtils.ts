/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataTypes, Model } from 'sequelize';
import * as dotWild from 'dot-wild';
import merge from 'deepmerge';

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
  [DataTypes.BOOLEAN.key]: 'boolean',
  [DataTypes.TIME.key]: 'string',
  [DataTypes.DATE.key]: 'string',
  [DataTypes.DATEONLY.key]: 'string',
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
};

// Get the column information using the describe method
const getColumnInformation = async (model: typeof Model) => {
  const tableDetails = await model.describe();
  const columns = Object.entries(tableDetails).map(([columnName, columnDetails]) => ({
    columnName,
    dataType: columnDetails.type,
    allowNull: columnDetails.allowNull,
  }));
  return columns;
};

const getColumnNamesFromModelForType = async (
  model: typeof Model,
  type,
) => {
  const modelData = await getColumnInformation(model);
  return modelData
    .filter(({ dataType }) => dataType === type)
    .map(({ columnName }) => columnName);
};

const filterDataToModel = async (
  data: Record<string, any>,
  model: typeof Model,
): Promise<{ matched: Record<string, any>, unmatched: Record<string, any> }> => {
  const modelData = await getColumnInformation(model);

  return Object.entries(data)
    .reduce((acc, [key, value]) => {
      const matchColumn = modelData.find((md) => md.columnName === key);
      if (matchColumn
        && ((value === null && matchColumn?.allowNull)
          || (typeof value === dataTypeMapping[matchColumn?.dataType]))
      ) {
        acc.matched[key] = value;
      } else {
        acc.unmatched[key] = value;
      }

      return acc;
    }, { matched: {}, unmatched: {} });
};

const remapPrune = (
  data,
  prunePath: string,
  options: { deleteEmptyParents?: boolean },
) => {
  const {
    deleteEmptyParents = true,
  } = options;

  let prune = data;
  // Remove the source path from the remapped data
  prune = dotWild.remove(prune, prunePath);

  if (deleteEmptyParents) {
    // Recursively check and remove empty parent objects/arrays
    let parentPath = prunePath.substring(
      0,
      prunePath.includes('.')
        ? prunePath.lastIndexOf('.')
        : 0,
    );
    while (parentPath && parentPath !== '') {
      const parentValue = dotWild.get(prune, parentPath);

      // If the parent value is an empty array, add remove
      if (Array.isArray(parentValue) && parentValue.length === 0) {
        prune = dotWild.remove(prune, parentPath);
      // If the parent value is an empty object, add remove
      } else if (typeof parentValue === 'object' && Object.keys(parentValue).length === 0) {
        prune = dotWild.remove(prune, parentPath);
      }

      // Update the parent path to check the next level
      parentPath = parentPath.includes('.')
        ? parentPath.substring(0, parentPath.lastIndexOf('.'))
        : '';
    }
  }
  return prune;
};

type RemappingDefinition = Record<string, string | (
  (
    data: object | object[]
  ) => object | object[]
  |
  string
)[]>;

/**
 * Remaps the data based on the provided remapping definition.
 * @param data - The JSON data to be remapped.
 * @param remappingDefinition - The remapping definition object.
 * @param reverse - Flag indicating whether to perform reverse remapping. Default is false.
 * @returns The remapped data.
 */
const remap = (
  data: object | object[],
  remappingDefinition: RemappingDefinition,
  options:{
    reverse?: boolean,
    keepUnmappedValues?: boolean,
    deleteMappedValues?: boolean,
    deleteEmptyParents?: boolean,
  } = {},
): {
  mapped: object | object[],
  unmapped: object | object[],
} => {
  // If jsonData is null or undefined, return null
  if (data === null || data === undefined) return null;
  const {
    reverse = false,
    deleteMappedValues = true,
    deleteEmptyParents = true,
    keepUnmappedValues = true,
  } = options;

  let remappedData;
  let unmappedData = data;
  if (keepUnmappedValues) {
    remappedData = data;
  } else if (Array.isArray(data)) {
    remappedData = [];
  } else {
    remappedData = {};
  }

  // Iterate over each key in the remapping definition
  Object.keys(remappingDefinition).forEach((key) => {
    // Determine the source and target paths based on the reverse flag
    // eslint-disable-next-line no-nested-ternary
    let sourcePath:string;
    if (reverse) {
      sourcePath = Array.isArray(remappingDefinition[key])
        ? remappingDefinition[key].slice(-1)
        : remappingDefinition[key];
    } else {
      sourcePath = key;
    }
    const targetDefinition = reverse
      ? key
      : remappingDefinition[key];
    const targetActions = Array.isArray(targetDefinition)
      ? targetDefinition
      : [targetDefinition];
    // Get the value from the source path in the remapped data
    let sourceValue = dotWild.get(
      keepUnmappedValues
        ? remappedData
        : data,
      sourcePath,
    );

    // If the source value exists
    if (sourceValue !== undefined) {
      targetActions.forEach((targetAction) => {
        if (targetAction instanceof Function) {
          sourceValue = targetAction(sourceValue);
          // Set the source value at the target path in the remapped data
        } else if (Array.isArray(sourceValue) && targetAction.includes('*')) {
          sourceValue.forEach((value, index) => {
            const updatedTargetAction = targetAction.replace('*', index.toString());
            remappedData = dotWild.set(remappedData, updatedTargetAction, value);
          });
        } else {
          remappedData = dotWild.set(remappedData, targetAction, sourceValue);
        }
      });

      // if keepUnmappedValues && deleteMappedValues, remove sourcePath and empty parent structures
      if (keepUnmappedValues && deleteMappedValues) {
        remappedData = remapPrune(remappedData, sourcePath, { deleteEmptyParents });
      }
      unmappedData = remapPrune(unmappedData, sourcePath, { deleteEmptyParents });
    }
  });

  return { mapped: remappedData, unmapped: unmappedData };
};

/**
 * Checks if a value is an object.
 *
 * @param value - The value to be checked.
 * @returns A boolean indicating whether the value is an object or not.
 */
const isObject = (value: any): boolean => (
  typeof value === 'object' // Check if the value is of type 'object'
  && value !== null // Check if the value is not null
  && !Array.isArray(value) // Check if the value is not an array
);

/**
 * Checks if two values are deeply equal.
 * @param value1 - The first value to compare.
 * @param value2 - The second value to compare.
 * @returns True if the values are deeply equal, false otherwise.
 */
const isDeepEqual = (value1: any, value2: any): boolean => {
  // Check if both values are objects
  if (isObject(value1) && isObject(value2)) {
    // Get the keys of each object
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);

    // If the number of keys is different, the objects are not deeply equal
    if (keys1.length !== keys2.length) return false;

    // Recursively check if each key-value pair is deeply equal
    return keys1.every((key) => isDeepEqual(value1[key], value2[key]));
  }

  // Check if both values are arrays
  if (Array.isArray(value1) && Array.isArray(value2)) {
    // If the lengths of the arrays are different, they are not deeply equal
    if (value1.length !== value2.length) return false;

    // Recursively check if each element in the arrays is deeply equal
    return value1.every((element, index) => isDeepEqual(element, value2[index]));
  }

  // If the values are not objects, perform a strict equality check
  return value1 === value2;
};

/**
 * Collects the values from incomingValues that have changed compared to currentValues.
 * @param incomingValues - The new values to compare.
 * @param currentValues - The current values to compare against.
 * @returns An object containing the changed values.
 * @throws Error if either incomingValues or currentValues is not an object.
 */
const collectChangedValues = (
  incomingValues: Record<string, any>,
  currentValues: Record<string, any>,
): Record<string, any> => {
  // Check if both incomingValues and currentValues are objects
  if (!isObject(incomingValues) || !isObject(currentValues)) {
    throw new Error('Both incomingValues and currentValues must be objects');
  }

  // Create an empty object to store the changed values
  const changedValues: Record<string, any> = {};

  // Iterate over each key-value pair in incomingValues
  Object.entries(incomingValues)
    .forEach(([key, value]) => {
      // Check if the value has changed compared to the corresponding value in currentValues
      if (!isDeepEqual(value, currentValues[key])) {
        // Add the changed value to the changedValues object
        changedValues[key] = value;
      }
    });

  // Return the object containing the changed values
  return changedValues;
};

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
const includeToFindAll = async (
  includeFunc,
  moreWhere,
  funcArgs = null,
  attributes = null,
) => {
  // Destructure the properties 'as', 'model', 'where', and other arguments from the result of
  // calling the include function
  const {
    as,
    model,
    where,
    ...args
  } = includeFunc(...funcArgs);

  // Find all records of the model, applying the merged 'where' condition and any additional
  // conditions
  return model.findAll({
    where: merge(where, moreWhere),
    ...(attributes && { attributes }),
    ...args,
  });
};

export {
  getColumnNamesFromModelForType,
  getColumnInformation,
  filterDataToModel,
  type RemappingDefinition,
  remap,
  isDeepEqual,
  collectChangedValues,
  includeToFindAll,
};
