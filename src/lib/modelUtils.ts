import { DataType, Model } from 'sequelize';
import * as dotWild from 'dot-wild';

// Define the mapping between Sequelize data types and TypeScript data types
const dataTypeMapping: Record<string, string> = {
  // [typeof DataType.STRING]: 'string',
  // [typeof DataType.INTEGER]: 'number',
  // [typeof DataType.FLOAT]: 'number',
  // [typeof DataType.DOUBLE]: 'number',
  // [typeof DataType.BOOLEAN]: 'boolean',
  // [typeof DataType.BIGINTEGER]: 'number',
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

const filterDataToModel = async (
  data: Record<string, any>,
  model: typeof Model,
): Promise<{ matched: Record<string, any>, unmatched: Record<string, any> }> => {
  const modelData = await getColumnInformation(model);

  return Object.entries(data)
    .reduce((acc, [key, value]) => {
      const matchColumn = modelData.find((md) => md.columnName === key);

      if (matchColumn
        && ((value === null && matchColumn.allowNull)
          || (typeof value === dataTypeMapping[matchColumn.dataType]))
      ) {
        acc.matched[key] = value;
      } else {
        acc.unmatched[key] = value;
      }

      return acc;
    }, { matched: {}, unmatched: {} });
};

const switchAttributeNames = (
  obj: Record<string, any>,
  remappings: Record<string, string>,
): Record<string, any> => {
  const switchedObj: Record<string, any> = {};

  Object.entries(obj)
    .forEach(([key, value]) => {
      switchedObj[remappings[key] || key] = value;
    });

  return switchedObj;
};

const remapData = (
  jsonData: any,
  remappingDefinition: any,
  reverse = false,
): any => {
  let remappedData = JSON.parse(JSON.stringify(jsonData));

  Object.keys(remappingDefinition).forEach((key) => {
    const sourcePath = reverse ? remappingDefinition[key] : key;
    const targetPath = reverse ? key : remappingDefinition[key];
    const sourceValue = dotWild.get(jsonData, sourcePath);

    if (sourceValue !== undefined) {
      remappedData = dotWild.set(remappedData, targetPath, sourceValue);
      remappedData = dotWild.remove(remappedData, sourcePath);

      // recursively check and remove empty parent objects\arrays
      let parentPath = sourcePath.substring(0, sourcePath.lastIndexOf('.'));
      while (parentPath && parentPath !== '') {
        const parentValue = dotWild.get(remappedData, parentPath);
        if (Array.isArray(parentValue) && parentValue.length === 0) {
          remappedData = dotWild.remove(remappedData, parentPath);
        } else if (typeof parentValue === 'object' && Object.keys(parentValue).length === 0) {
          remappedData = dotWild.remove(remappedData, parentPath);
        }
        parentPath = parentPath.substring(0, parentPath.lastIndexOf('.'));
      }
    }
  });

  return remappedData;
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

export {
  getColumnInformation,
  filterDataToModel,
  switchAttributeNames,
  remapData,
  isDeepEqual,
  collectChangedValues,
};
