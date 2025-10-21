import { sanitizeUrl } from '@braintree/sanitize-url';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

const purifyConfig = { ALLOWED_TAGS: [], ALLOWED_ATTR: [] };

/**
 * Sanitize a string value by decoding, purifying, and URL-sanitizing
 * @param {string} value - The value to sanitize
 * @returns {string} The sanitized value
 */
const sanitizeString = (value) => {
  try {
    const decoded = decodeURIComponent(value);
    const purified = DOMPurify.sanitize(decoded, purifyConfig);
    return sanitizeUrl(purified);
  } catch (e) {
    // If decoding fails, sanitize the original value
    return sanitizeUrl(value);
  }
};

/**
 * Middleware to sanitize URL parameters to prevent malicious HTML injection
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const sanitizeUrlParams = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = Object.keys(req.query).reduce((sanitized, key) => ({
        ...sanitized,
        [key]: typeof req.query[key] === 'string'
          ? sanitizeString(req.query[key])
          : req.query[key],
      }), {});
    }

    // Sanitize path parameters
    if (req.params && typeof req.params === 'object') {
      req.params = Object.keys(req.params).reduce((sanitized, key) => ({
        ...sanitized,
        [key]: typeof req.params[key] === 'string'
          ? sanitizeString(req.params[key])
          : req.params[key],
      }), {});
    }

    next();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error sanitizing parameters:', e);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request',
    });
  }
};

export default sanitizeUrlParams;
