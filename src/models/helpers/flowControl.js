/**
 * Checks if a given function name matches a specified value.
 *
 * @param functionName - The name of the function to check.
 * @param value - The value to match against the function name.
 * It can be either a string or an object with properties `name`, `prefix`, and `suffix`.
 * @returns A boolean indicating whether the function name matches the value.
 */
function isMatch(functionName, value) {
  //   functionName: string,
  //   value: string | { name: string, prefix?: boolean, suffix?: boolean },
  // ): boolean {
  // If the value is a string, convert it to an object with default prefix and suffix
  // values set to false

  const matchValue =
    typeof value === 'string'
      ? { name: value, prefix: false, suffix: false }
      : {
          prefix: false,
          suffix: false,
          ...value,
        }

  // Check if the value has a prefix flag
  if (matchValue.prefix) {
    return functionName.startsWith(matchValue.name)
  }

  // Check if the value has a suffix flag
  if (matchValue.suffix) {
    return functionName.endsWith(matchValue.name)
  }

  // No prefix or suffix flag, perform exact match
  return functionName === matchValue.name
}

/**
 * Checks if a given function name is contained in the provided argument.
 * The argument can be a string, an object with a 'name' property, or an array of
 * strings or objects with a 'name' property.
 * The function name must not be empty or null.
 * @param arg - The argument to check for the function name.
 * @param functionName - The function name to search for.
 * @returns True if the function name is found in the argument, false otherwise.
 */
function containsName(arg, functionName) {
  // arg:
  // string
  // | { name: string, prefix?: boolean, suffix?: boolean }
  // | Array<
  // string
  // | { name: string, prefix?: boolean, suffix?: boolean }
  // >,
  // functionName?: string | null,
  // ): boolean {
  // Check if the function name is empty or null
  if (!functionName || functionName === '') {
    return false
  }

  // Check if the argument is a string or an object
  if (typeof arg === 'string' || (typeof arg === 'object' && !Array.isArray(arg))) {
    return isMatch(
      functionName,
      arg
      // arg as string | { name: string, prefix: boolean, suffix: boolean },
    )
  }

  // Check if the argument is an array
  if (Array.isArray(arg)) {
    return arg.some((item) => isMatch(functionName, item))
    // return (arg as Array<string | { name: string, prefix: boolean, suffix: boolean }>)
    //   .some((item: string | { name: string, prefix: boolean, suffix: boolean }) => isMatch(
    //     functionName,
    //     item,
    //   ));
  }

  return false
}

/**
 * Checks if the given options object has the property 'ignoreHooks' defined and not null.
 * @param {object} options - The options object to check.
 * @returns {boolean} - True if the options object has 'ignoreHooks' defined and not null, false
 * otherwise.
 */
const hasIgnoreHooks = (options) => options.ignoreHooks !== undefined && options.ignoreHooks !== null

/**
 * Checks if the given options object has ignoreHooks property and returns a boolean value.
 * @param options - The sequelize options object.
 * @param callingFunctionName - The name of the calling function (optional).
 * @returns A boolean value indicating whether to skip the execution based on the ignoreHooks
 * property in the options object.
 */
function skipIf(
  options, // The sequelize options object
  callingFunctionName
  // callingFunctionName?: string | null, // The name of the calling function (optional)
) {
  // : boolean {
  // Check if the options object does not have ignoreHooks property, return false
  if (!hasIgnoreHooks(options)) return false

  // Get the name of the calling function
  const functionName =
    callingFunctionName ||
    (new Error().stack || '')
      .split('\n')[2]
      .trim()
      .match(/at (\S+)/)?.[1] ||
    ''

  // Return true if the functionName is present in the ignoreHooks array of options
  return containsName(options.ignoreHooks, functionName)
}

module.exports = {
  ...(process.env.NODE_ENV !== 'production' && {
    isMatch,
    containsName,
    hasIgnoreHooks,
  }),
  skipIf,
}
