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
 * Middleware to sanitize URL parameters to prevent malicious HTML injection
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const sanitizeUrlParams = (req, res, next) => {
  try {
    if (req.originalUrl || req.url) {
      const originalUrl = req.originalUrl || req.url;
      // We'll sanitize the full URL path components
      const pathParts = originalUrl.split('/');
      const sanitizedParts = pathParts.map((part) => {
        if (!part) return part; // Skip empty parts
        return sanitizeString(part);
      });

      // Store the sanitized URL for reference/debugging
      req.sanitizedUrl = sanitizedParts.join('/');

      // If we detect malicious content, block the request
      // Check both for literal HTML tags and for encoded HTML tag patterns
      const hasLiteralHtmlTags = originalUrl.includes('<') || originalUrl.includes('>');

      // Decode and check if it contains actual HTML tags (more precise than just checking for %3C)
      let decodedUrl = originalUrl;
      try {
        decodedUrl = decodeURIComponent(originalUrl);
      } catch (e) {
        // If decoding fails, use original
        decodedUrl = originalUrl;
      }

      // Check for common HTML tag patterns that indicate malicious content
      const hasDecodedHtmlTags = /<[a-z!]+[>\s/]/i.test(decodedUrl);

      if (originalUrl !== req.sanitizedUrl && (hasLiteralHtmlTags || hasDecodedHtmlTags)) {
        // Respond with 400 Bad Request to prevent the request from proceeding
        res.status(400).json({
          error: 'Bad Request',
          message: 'Request contains potentially malicious content',
        });

        // Don't call next(), which prevents the request from proceeding
        return;
      }
    }

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
