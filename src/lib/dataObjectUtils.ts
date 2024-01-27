/* eslint-disable @typescript-eslint/no-explicit-any */
import * as dotWild from 'dot-wild';

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
 * Removes undefined values from an object or array recursively.
 * @param obj - The object or array to remove undefined values from.
 * @returns A new object or array with undefined values removed, or
 * undefined if all values are undefined.
 */
const removeUndefined = (obj: any): any => {
  // Check if the input is an object
  if (!isObject(obj)) {
    return obj;
  }

  // Check if the input is an array
  if (Array.isArray(obj)) {
    // Map over each element in the array and recursively remove undefined values
    // Filter out any elements that are undefined
    return obj
      .map(removeUndefined)
      .filter((value: any) => value !== undefined);
  }

  // Create a new empty object
  const result: any = {};

  // Iterate over each key in the object
  Object.keys(obj).forEach((key: string) => {
    // Recursively remove undefined values from the value associated with the current key
    const value = removeUndefined(obj[key]);

    // If the value is not undefined, add it to the result object
    if (value !== undefined) {
      result[key] = value;
    }
  });

  // Check if the result object is empty
  if (Object.keys(result).length === 0) {
    return undefined;
  }

  // Return the result object
  return result;
};

type RemappingDefinition = Record<string, string | (
  // (
  //   data: object | object[]
  // ) => object | object[]
  // |
  string
)[]>;

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
type TargetFunction = (input: string | object) => Record<string, any>;
type TargetFunctions = { [key:string]: TargetFunction };

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
    targetFunctions?: TargetFunctions,
  } = {},
): {
  mapped: object | object[] | null,
  unmapped: object | object[] | null,
} => {
  // If data is null or undefined, return null
  if (data === null || data === undefined) return { mapped: null, unmapped: null };
  const {
    reverse = false,
    deleteMappedValues = true,
    deleteEmptyParents = true,
    keepUnmappedValues = true,
    targetFunctions = {},
  } = options;

  let remappedData;
  let unmappedData = data;
  if (keepUnmappedValues) {
    remappedData = data;
  } else {
    const targets = reverse
      ? Object.keys(remappingDefinition)
      : Object.values(remappingDefinition);
    const targetStructureIsArray = targets
      .every((target) => {
        if (Array.isArray(target)) return false;
        const prefix = target.split('.')[0];
        return (prefix === '*'
        || (Number.isInteger(Number(prefix))
        && Number(prefix) > 0));
      });
    if (targetStructureIsArray) {
      remappedData = [];
    } else {
      remappedData = {};
    }
  }

  // Iterate over each key in the remapping definition
  Object.keys(remappingDefinition).forEach((key) => {
    // Determine the source and target paths based on the reverse flag
    // eslint-disable-next-line no-nested-ternary
    let sourcePath:string;
    if (reverse) {
      sourcePath = Array.isArray(remappingDefinition[key])
        ? remappingDefinition[key].slice(-1) as string
        : remappingDefinition[key] as string;
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
    const sourceValue = dotWild.get(
      keepUnmappedValues
        ? remappedData
        : data,
      sourcePath,
    );

    // If the source value exists
    if (sourceValue !== undefined || sourceValue !== null) {
      targetActions.forEach((targetAction) => {
        /* TODO: fix later
        if (targetAction instanceof Function) {
          sourceValue = targetAction(sourceValue);
          // Set the source value at the target path in the remapped data
        } else */ if (Array.isArray(sourceValue) && targetAction.includes('*')) {
          sourceValue.forEach((value, index) => {
            const updatedTargetAction = targetAction.replace('*', index.toString());
            remappedData = dotWild.set(remappedData, updatedTargetAction, value);
          });
        } else {
          const targetFunction = targetFunctions[targetAction];
          if (targetFunction) {
            const modifiedRecords = targetFunction(sourceValue);
            Object.entries(modifiedRecords).forEach(([recordKey, recordValue]) => {
              remappedData = dotWild.set(remappedData, recordKey, recordValue);
            });
          } else {
            remappedData = dotWild.set(remappedData, targetAction, sourceValue);
          }
        }
      });

      // if keepUnmappedValues && deleteMappedValues, remove sourcePath and empty parent structures
      if (keepUnmappedValues && deleteMappedValues) {
        remappedData = remapPrune(remappedData, sourcePath, { deleteEmptyParents });
      }
      unmappedData = remapPrune(unmappedData, sourcePath, { deleteEmptyParents });
    }
  });
  remappedData = removeUndefined(remappedData);
  unmappedData = removeUndefined(unmappedData);

  return { mapped: remappedData, unmapped: unmappedData };
};

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
 * Recursively merges multiple objects into one, with deeper levels of nesting.
 * @param {...object} sources - The objects to be merged.
 * @returns {object} - The merged object.
 */
const mergeDeep = (...sources) => {
  // If there are less than 2 sources, return the first source
  if (sources.length < 2) return sources.shift();

  // Remove the first two sources from the array
  const target = sources.shift();
  const source = sources.shift();

  // Check if both target and source are objects
  if (isObject(target) && isObject(source)) {
    // Iterate over each key in the source object
    Object.keys(source).forEach((key) => {
      // If the value at the current key in the source object is also an object
      if (isObject(source[key])) {
        // If the target object does not have a property with the current key,
        // assign an empty object to that property
        if (!target[key]) Object.assign(target, { [key]: {} });

        // Recursively merge the nested objects
        mergeDeep(target[key], source[key]);
      } else {
        // Assign the value at the current key in the source object to the target object
        Object.assign(target, { [key]: source[key] });
      }
    });
  }

  // Recursively merge the remaining sources with the updated target object
  return mergeDeep(target, ...sources);
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
      if (!isDeepEqual(value, currentValues[key])
      || (key === 'id'
      && value === currentValues[key])) {
        // Add the changed value to the changedValues object
        changedValues[key] = value;
      }
    });

  // Return the object containing the changed values
  return changedValues;
};

type SimplifiedObject = { [key: string]: string };

const simplifyObject = (obj: any, childrenName: string, valueName: string): SimplifiedObject => {
  let simplified: SimplifiedObject = {};

  // Check if the object has children
  if (obj[childrenName] && Array.isArray(obj[childrenName])) {
    obj[childrenName].forEach((child: any) => {
      // If a child has text, add it to the simplified object
      if (child[valueName]) {
        simplified[child.name] = child[valueName];
      }

      // Recursively simplify child objects
      const childSimplified = simplifyObject(child, childrenName, valueName);
      simplified = { ...simplified, ...childSimplified };
    });
  }

  return simplified;
};

/**
 * Detects the type of a given value and casts it to its appropriate JavaScript type.
 *
 * @param value - The value to be detected and cast. It can be of any type.
 * @returns An object containing two properties: `value` and `type`. The `value` property
 *          is the cast value, which can be of type boolean, number, Date, any, null, undefined,
 *          array, or object. The `type` property is a string representing the detected type of
 *          the value. Possible types are 'null', 'undefined', 'boolean', 'number', 'Date',
 *          'array', 'object', or the typeof the original value if none of the other types match.
 * @throws If the `value` is a string that looks like a JSON but is not valid JSON, it will catch
 *         and ignore the error internally, returning the original string as the value.
 */
const detectAndCast = (value: string): {
  value: boolean | number | Date | any | null | undefined | any[] | object,
  type: string
} => {
  // Check for null
  if (value.toLowerCase() === 'null') return { value: null, type: 'null' };

  // Check for undefined
  if (value.toLowerCase() === 'undefined') return { value: undefined, type: 'undefined' };

  // Check for boolean
  if (value.toLowerCase() === 'true') return { value: true, type: 'boolean' };
  if (value.toLowerCase() === 'false') return { value: false, type: 'boolean' };

  // Check for number
  if (!Number.isNaN(value) && !Number.isNaN(parseFloat(value))) {
    return { value: Number(value), type: 'number' };
  }

  // Check for date
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    // You might want to add additional checks to ensure it's a valid date string
    return { value: date, type: 'Date' };
  }

  // Check for array or object
  try {
    const parsedValue = JSON.parse(value);
    if (Array.isArray(parsedValue)) {
      return { value: parsedValue, type: 'array' };
    }
    if (typeof parsedValue === 'object' && parsedValue !== null) {
      return { value: parsedValue, type: 'object' };
    }
  } catch (e) {
    // Not a valid JSON string
  }

  // If none of the above, return the original string
  return { value, type: typeof value };
};

/**
 * Transforms the keys of the given object by making the first letter of each key lowercase.
 * The original object is not modified; a new object with the transformed keys is returned.
 *
 * @param obj - An object with string keys, where the keys need to be transformed.
 * @returns A new object with the same values as the input object but with each key's first
 *  letter converted to lowercase.
 */
function lowercaseFirstLetterOfKeys<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const lowercasedKey = key.charAt(0).toLowerCase() + key.slice(1);
    result[lowercasedKey] = obj[key];
  });

  return result;
}

export {
  isObject,
  removeUndefined,
  type RemappingDefinition,
  remapPrune,
  remap,
  isDeepEqual,
  mergeDeep,
  collectChangedValues,
  simplifyObject,
  detectAndCast,
  lowercaseFirstLetterOfKeys,
};
