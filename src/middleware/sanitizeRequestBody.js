import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { logger } from '../logger';

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

// Configuration for sanitization (allows safe formatting tags from Draft.js and rich text editors)
// Removes dangerous tags and attributes while preserving legitimate HTML formatting
const purifyConfig = {
  ALLOWED_TAGS: ['b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ol', 'ul', 'li', 'strong', 'em', 'ins', 'del'],
  ALLOWED_ATTR: [],
};

/**
 * Sanitize a string value by decoding and purifying
 * @param {string} value - The value to sanitize
 * @returns {string} The sanitized value
 */
const sanitizeString = (value) => {
  // Return empty strings as-is to avoid unnecessary processing
  if (value === '') {
    return '';
  }

  try {
    const decoded = decodeURIComponent(value);
    return DOMPurify.sanitize(decoded, purifyConfig);
  } catch (e) {
    // If decoding fails, sanitize the original value
    return DOMPurify.sanitize(value, purifyConfig);
  }
};

/**
 * Recursively sanitize all string values in an object
 * @param {any} obj - The object to sanitize
 * @param {number} depth - Current recursion depth (internal use)
 * @param {number} maxDepth - Maximum allowed recursion depth (default: 100)
 * @returns {any} The sanitized object
 * @throws {Error} If maximum recursion depth is exceeded
 */
const sanitizeObject = (obj, depth = 0, maxDepth = 100) => {
  if (depth > maxDepth) {
    throw new Error(`Sanitization depth limit exceeded: maximum depth is ${maxDepth}`);
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1, maxDepth));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach((key) => {
      sanitized[key] = sanitizeObject(obj[key], depth + 1, maxDepth);
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
 * @returns {function} Express middleware function
 */
const sanitizeRequestBody = (maxBodySize = 1000000, maxDepth = 100) => (req, res, next) => {
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
      req.body = sanitizeObject(req.body, 0, maxDepth);
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
