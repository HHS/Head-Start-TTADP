import React from 'react';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks if a string contains HTML tags
 * @param {*} str - The string to check
 * @returns {boolean} - True if plain text (no HTML tags), false otherwise
 */
function isPlainText(str) {
  if (typeof str !== 'string') return false;
  // Check if string contains HTML tags
  return !/<[a-z][\s\S]*>/i.test(str);
}

export function renderEditor(heading, data) {
  /**
     * sometimes, we may receive JSX
     */
  if (typeof data === 'object') {
    return data;
  }

  /**
     * if it's plain text with no HTML tags, render directly
     * this avoids unnecessary processing and removes aria-label="rdw-wrapper"
     */
  if (isPlainText(data)) {
    return <span data-text="true">{data}</span>;
  }

  /**
     * for rich HTML content, sanitize with DOMPurify and convert to React elements
     */
  const sanitized = DOMPurify.sanitize(data || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'ins', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return (
    <div className="parsed-html-content" aria-label={typeof heading === 'string' ? heading : 'Content'}>
      {parse(sanitized)}
    </div>
  );
}

export default function renderReadOnlyContentData(heading, data) {
  if (Array.isArray(data)) {
    const cleanData = data.filter((d) => d);
    return (
      <ul>
        {cleanData.map((line) => <li key={uuidv4()} className="margin-bottom-1">{renderEditor(heading, line)}</li>)}
      </ul>
    );
  }

  return renderEditor(heading, data);
}
