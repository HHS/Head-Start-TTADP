import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent HTML injection attacks
 * @param {string} content - HTML content to sanitize
 * @returns {string} Sanitized HTML content
 */
function sanitizeHtml(content) {
  if (!content) {
    return '';
  }

  if (typeof content !== 'string') {
    return String(content);
  }

  return DOMPurify.sanitize(content);
}

export default sanitizeHtml;
