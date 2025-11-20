/* eslint-disable @typescript-eslint/no-explicit-any */
import * as dotWild from 'dot-wild';
import moment from 'moment-timezone';

/**
 * Checks if a value is an object.
 *
 * @param value - The value to be checked.
 * @returns A boolean indicating whether the value is an object or not.
 */
const isObject = (obj): boolean => (
  !!obj
  && typeof obj === 'object'
  && !Array.isArray(obj)
  && !(obj instanceof Date)
);

/**
 * Removes undefined values from an object or array recursively.
 * @param obj - The object or array to remove undefined values from.
 * @returns A new object or array with undefined values removed, or
 * undefined if all values are undefined.
 */
const removeUndefined = (obj) => {
  // Check if the input is an array
  if (Array.isArray(obj)) {
    // Map over each element in the array and recursively remove undefined values
    // Filter out any elements that are undefined
    return obj
      .map(removeUndefined)
      .filter((value) => value !== undefined);
  }

  // Check if the input is an object
  if (!isObject(obj)) {
    return obj;
  }

  // Create a new empty object
  const result = {};

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

/**
 * Takes an object and a path to prune from that object, optionally removing empty parent
 * objects or arrays. It uses dot notation to access nested properties and can handle wildcards.
 *
 * @param data - The object from which properties should be pruned.
 * @param prunePath - A string representing the path to the property that should be removed.
 * Can include wildcards.
 * @param options - An optional object with the following properties:
 *   @property deleteEmptyParents - A boolean indicating whether to delete empty parent objects
 * or arrays after pruning. Defaults to true.
 * @returns The pruned object, with the specified path and potentially empty parents removed.
 */
const remapPrune = (
  data,
  prunePath: string,
  options: { deleteEmptyParents?: boolean } = {},
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
        ? (remappingDefinition[key].slice(-1) as unknown as string)
        : (remappingDefinition[key] as string);
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
    if (sourceValue !== undefined) {
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
  remappedData = removeUndefined(remappedData) || null;
  unmappedData = removeUndefined(unmappedData) || null;

  return { mapped: remappedData, unmapped: unmappedData };
};

function areNumbersEqual(value1: any, value2: any): boolean {
  // Check if both values are NaN
  if (Number.isNaN(value1) && Number.isNaN(value2)) {
    return true;
  }
  // If neither value is a number, return true
  if (typeof value1 !== 'number' && typeof value2 !== 'number') {
    return true;
  }

  // If either value is a number, convert both to numbers and compare
  const num1 = Number(value1);
  const num2 = Number(value2);

  // Check if the converted numbers are equal
  return num1 === num2;
}

function areDatesEqual(value1: any, value2: any): boolean {
  // Helper function to convert a value to a Date object if it's a string or already a Date
  function toDate(value: any): Date | null {
    if (typeof value === 'string' || value instanceof Date) {
      const date = new Date(value);
      // Check if the date is valid
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
  }

  // Convert both values to Date objects, if possible
  const date1 = toDate(value1);
  const date2 = toDate(value2);

  // If either value could not be converted to a valid Date, they are not equal dates
  if (date1 === null || date2 === null) {
    return false;
  }

  // Compare the time values of the dates
  return date1.getTime() === date2.getTime();
}

/**
 * Checks if two values are deeply equal.
 * @param value1 - The first value to compare.
 * @param value2 - The second value to compare.
 * @returns True if the values are deeply equal, false otherwise.
 */
const isDeepEqual = (value1: any, value2: any, ignoreType = false): boolean => {
  // Check if both values are objects
  if (isObject(value1) && isObject(value2)) {
    // Get the keys of each object
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);

    // If the number of keys is different, the objects are not deeply equal
    if (keys1.length !== keys2.length) return false;

    // Recursively check if each key-value pair is deeply equal
    return keys1.every((key) => isDeepEqual(value1[key], value2[key], ignoreType));
  }

  // Check if both values are arrays
  if (Array.isArray(value1) && Array.isArray(value2)) {
    // If the lengths of the arrays are different, they are not deeply equal
    if (value1.length !== value2.length) return false;

    // Recursively check if each element in the arrays is deeply equal
    return value1.every((element, index) => isDeepEqual(element, value2[index]));
  }

  if (ignoreType
    && (typeof value1 === 'number'
    || typeof value2 === 'number')) {
    return areNumbersEqual(value1, value2);
  }

  if (ignoreType
    && (value1 instanceof Date
    || value2 instanceof Date)) {
    return areDatesEqual(value1, value2);
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
  // If there are less than 2 sources, return the first source or an empty object
  if (sources.length < 1) return {};
  if (sources.length < 2) return sources[0];

  const target = {};
  sources.forEach((source) => {
    if (isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (isObject(source[key])) {
          if (!target[key] || !isObject(target[key])) {
            target[key] = {};
          }
          Object.assign(target[key], mergeDeep(target[key], source[key]));
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      });
    } else if (source instanceof Date) {
      // If the source is a Date, we directly assign it
      Object.assign(target, source);
    } else {
      // For other non-object types, we just copy the value
      Object.assign(target, source);
    }
  });

  return target;
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
      if (!isDeepEqual(value, currentValues[key], true)
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

/**
 * Simplifies a nested object structure by flattening it into a single-level object with
 * key-value pairs. The keys are determined by the 'name' property of child objects, and
 * the values are taken from the property specified by the 'valueName' parameter. The
 * function recursively processes child objects found under the property specified by the
 * 'childrenName' parameter.
 *
 * @param obj - The object to simplify. Expected to be an object with nested child objects.
 * @param childrenName - The property name in 'obj' that contains the array of child objects.
 * @param valueName - The property name in child objects whose value will be extracted and
 * added to the simplified object.
 * @returns A new object of type SimplifiedObject that is a flattened version of 'obj',
 * containing only the key-value pairs.
 *
 * Note: The function assumes that each child object has a 'name' property which is used as
 * the key in the simplified object. If 'obj' does not have the expected structure, the function
 * may not behave as intended.
 */
const simplifyObject = (obj: any, childrenName: string, valueName: string): SimplifiedObject => {
  let simplified: SimplifiedObject = {};

  // Check if the object has children and if it's an array
  if (obj[childrenName] && Array.isArray(obj[childrenName])) {
    obj[childrenName].forEach((child: any) => {
      // Check if the child is an object and has the specified value name
      if (typeof child === 'object' && child !== null && child[valueName]) {
        simplified[child.name] = child[valueName];
      }

      // Recursively simplify child objects if it's an object
      if (typeof child === 'object' && child !== null) {
        const childSimplified = simplifyObject(child, childrenName, valueName);
        simplified = { ...simplified, ...childSimplified };
      }
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

  // check for number with leading zeros
  if (/^0\d*$/.test(value) && value.length > 1) {
    // It's an octal number string or a string with leading zeros, return as a string
    return {
      value,
      type: 'string',
    };
  }

  // Check for number
  const numberRegex = /^-?\d+(\.\d+)?$/;
  const numberMatch = value.match(numberRegex);
  if (numberMatch) {
    const newValue = Number(value);
    return {
      value: newValue,
      type: 'number',
    };
  }

  // Check for date
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(\.(\d{3}))?Z?)?$/;
  const dateMatch = value.match(dateRegex);
  if (dateMatch) {
    const year = +dateMatch[1];
    const month = +dateMatch[2];
    const day = +dateMatch[3];
    const hour = +dateMatch[4] || 0;
    const minute = +dateMatch[5] || 0;
    const second = +dateMatch[6] || 0;
    const date = moment.utc(value).toDate();
    if (date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second) {
      return {
        value: date,
        type: 'Date',
      };
    }
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

  if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      const lowercasedKey = key.charAt(0).toLowerCase() + key.slice(1);
      result[lowercasedKey] = obj[key];
    });
  } else {
    throw new Error('Input is not an object');
  }

  return result;
}

/**
 * Transforms all keys in the given object to lowercase.
 *
 * @param obj - The object whose keys are to be transformed to lowercase.
 * @returns A new object with all keys in lowercase.
 * @throws Will throw an error if the input is not an object.
 */
function lowercaseKeys<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};

  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) { // Check for null to ensure obj is a proper object
    Object.keys(obj).forEach((key) => {
      const lowercasedKey = key.toLowerCase(); // Lowercase the entire key
      result[lowercasedKey] = obj[key];
    });
  } else {
    throw new Error('Input is not an object');
  }

  return result;
}

/**
 * Creates an array of ranges from a list of numbers. Each range represents a sequence of
 * consecutive numbers.
 *
 * @param numbers - An array of numbers from which to create ranges.
 * @returns An array of tuples, where each tuple contains two numbers representing the start
 * and end of a consecutive range.
 */
function createRanges(numbers: number[]): [number, number][] {
  // Remove duplicates by converting to a Set and back to an array
  const uniqueNumbers = Array.from(new Set(numbers));
  // Sort the array first
  const sortedNumbers = uniqueNumbers.slice().sort((a, b) => a - b);

  // Use reduce to iterate over the numbers and accumulate them into ranges
  const ranges = sortedNumbers.reduce<[number, number][]>((acc, current) => {
    if (acc.length === 0) {
      // If the accumulator is empty, start the first range
      acc.push([current, current]);
    } else {
      const lastRange = acc[acc.length - 1];
      if (current === lastRange[1] + 1) {
        // If the current number is consecutive, extend the end of the last range
        lastRange[1] = current;
      } else {
        // If it's not consecutive, start a new range
        acc.push([current, current]);
      }
    }
    return acc;
  }, []);

  return ranges;
}

export {
  isObject,
  removeUndefined,
  type RemappingDefinition,
  remapPrune,
  remap,
  areNumbersEqual,
  areDatesEqual,
  isDeepEqual,
  mergeDeep,
  collectChangedValues,
  simplifyObject,
  detectAndCast,
  lowercaseFirstLetterOfKeys,
  lowercaseKeys,
  createRanges,
};
