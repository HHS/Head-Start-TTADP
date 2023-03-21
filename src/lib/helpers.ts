/* eslint-disable import/prefer-default-export */
/**
 * @param {unknown} valueToEvaluate anything that could be an array
 * @param {boolean} returnFalseOnEmpty whether to return false if the array is empty, default false
 *
 * @returns {boolean} whether or not the value is a valid array
 */
export function isArrayOrArrayOfNumbers(
  valueToEvaluate: unknown,
  returnFalseOnEmpty = false,
): boolean {
  if (!Array.isArray(valueToEvaluate)) {
    return false;
  }

  if (returnFalseOnEmpty && valueToEvaluate.length === 0) {
    return false;
  }

  return valueToEvaluate.every((value: unknown) => typeof value === 'number');
}
