import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { logger } from '../logger';

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

// Configuration for sanitization (allows safe formatting tags from Draft.js and rich text editors)
// Removes dangerous tags and attributes while preserving legitimate HTML formatting
const purifyConfig = {
  ALLOWED_TAGS: [
    'b',
    'i',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'ol',
    'ul',
    'li',
    'strong',
    'em',
    'ins',
    'del',
  ],
  ALLOWED_ATTR: [],
};

// Opt-in configuration for rich text whose editor has a link button (site alerts).
// DOMPurify's default URI check still strips unsafe hrefs (e.g. javascript:).
const purifyConfigWithLinks = {
  ALLOWED_TAGS: [...purifyConfig.ALLOWED_TAGS, 'a'],
  ALLOWED_ATTR: ['href', 'target'],
};

const ALLOWED_LINK_TARGETS = ['_blank', '_self'];

// Separate instance so the link hook never runs for the default configuration
const LinkDOMPurify = createDOMPurify(window);
LinkDOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A' || !node.hasAttribute('target')) {
    return;
  }

  if (!ALLOWED_LINK_TARGETS.includes(node.getAttribute('target'))) {
    node.removeAttribute('target');
  } else if (node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const purify = (value) => DOMPurify.sanitize(value, purifyConfig);
const purifyWithLinks = (value) => LinkDOMPurify.sanitize(value, purifyConfigWithLinks);

/**
 * Sanitize a string value by decoding and purifying
 * @param {string} value - The value to sanitize
 * @param {function} purifyFn - The purifier to apply
 * @returns {string} The sanitized value
 */
const sanitizeString = (value, purifyFn = purify) => {
  // Return empty strings as-is to avoid unnecessary processing
  if (value === '') {
    return '';
  }

  try {
    const decoded = decodeURIComponent(value);
    return purifyFn(decoded);
  } catch (e) {
    // If decoding fails, sanitize the original value
    return purifyFn(value);
  }
};

/**
 * Recursively sanitize all string values in an object
 * @param {any} obj - The object to sanitize
 * @param {number} depth - Current recursion depth (internal use)
 * @param {number} maxDepth - Maximum allowed recursion depth (default: 100)
 * @param {function} purifyFn - The purifier to apply to strings
 * @returns {any} The sanitized object
 * @throws {Error} If maximum recursion depth is exceeded
 */
const sanitizeObject = (obj, depth = 0, maxDepth = 100, purifyFn = purify) => {
  if (depth > maxDepth) {
    throw new Error(`Sanitization depth limit exceeded: maximum depth is ${maxDepth}`);
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, purifyFn);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1, maxDepth, purifyFn));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach((key) => {
      sanitized[key] = sanitizeObject(obj[key], depth + 1, maxDepth, purifyFn);
    });
    return sanitized;
  }

  // Return primitive values as-is (numbers, booleans, etc.)
  return obj;
};

/**
 * Middleware to sanitize request body data to prevent HTML injection
 * Validates payload size and recursively sanitizes all string values in the request body
 * @param {number} maxBodySize - Maximum allowed request body size in bytes (default: 1MB)
 * @param {number} maxDepth - Maximum allowed recursion depth (default: 100)
 * @param {object} options
 * @param {boolean} options.allowLinks - Keep <a href> (with a safe target) in rich text.
 *   Only for routes whose editor offers a link button (site alerts).
 * @returns {function} Express middleware function
 */
const sanitizeRequestBody =
  (maxBodySize = 1000000, maxDepth = 100, { allowLinks = false } = {}) =>
  (req, res, next) => {
    const purifyFn = allowLinks ? purifyWithLinks : purify;
    try {
      // Only sanitize if there is a body and it's an object (not for file uploads, etc.)
      if (req.body && typeof req.body === 'object') {
        // Check payload size
        const bodyString = JSON.stringify(req.body);
        if (bodyString.length > maxBodySize) {
          logger.warn('Request body exceeds maximum size', {
            size: bodyString.length,
            maxSize: maxBodySize,
          });
          res.status(413).json({
            error: 'Payload Too Large',
            message: `Request body exceeds maximum size of ${maxBodySize} bytes`,
          });
          return;
        }

        // Sanitize with depth limit
        req.body = sanitizeObject(req.body, 0, maxDepth, purifyFn);
      }

      next();
    } catch (e) {
      logger.error('Error sanitizing request body:', { error: e.message, stack: e.stack });
      res.status(400).json({
        error: 'Bad Request',
        message: e.message,
      });
    }
  };

export default sanitizeRequestBody;
