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
  // Return empty strings as-is to avoid conversion to 'about:blank'
  if (value === '') {
    return '';
  }

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
 * Recursively sanitize all string values in an object
 * @param {any} obj - The object to sanitize
 * @returns {any} The sanitized object
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach((key) => {
      sanitized[key] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }

  // Return primitive values as-is (numbers, booleans, etc.)
  return obj;
};

/**
 * Middleware to sanitize request body data to prevent HTML injection
 * Recursively sanitizes all string values in the request body
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const sanitizeRequestBody = (req, res, next) => {
  try {
    // Only sanitize if there is a body and it's an object (not for file uploads, etc.)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    next();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error sanitizing request body:', e);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request',
    });
  }
};

export default sanitizeRequestBody;
