/**
 * Normalizes the dual `param.operator` / `param.operator[]` query format
 * into a flat array.
 *
 * Express parses `?foo=a&foo=b` as an array and `?foo=a` as a string.
 * The bracket variant (`foo[]`) behaves the same way. This helper handles
 * both conventions so callers don't have to.
 *
 * @param {Object} query - Express req.query object
 * @param {string} baseName - The filter name (e.g. "priorityIndicator")
 * @param {string} operator - The operator suffix (e.g. "in", "nin")
 * @returns {string[]} Array of filter values, or empty array if not present
 */
export default function extractFilterArray(query, baseName, operator) {
  const value = query[`${baseName}.${operator}[]`] || query[`${baseName}.${operator}`];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
