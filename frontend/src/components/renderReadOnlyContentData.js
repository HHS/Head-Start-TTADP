import React from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { v4 as uuidv4 } from 'uuid';
import { getEditorState } from '../utils';

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
     * this avoids unnecessary Draft.js processing and removes aria-label="rdw-wrapper"
     */
  if (isPlainText(data)) {
    return <span>{data}</span>;
  }

  /**
     * for rich HTML content, use Draft.js Editor
     */
  let wrapperId = '';

  if (typeof heading === 'string') {
    wrapperId = `${heading.toLowerCase().replace(' ', '-')}-${uuidv4()}`;
  } else {
    wrapperId = uuidv4();
  }

  const defaultEditorState = getEditorState(data || '');

  return (
    <Editor
      readOnly
      toolbarHidden
      defaultEditorState={defaultEditorState}
      wrapperId={wrapperId}
      ariaLabel={typeof heading === 'string' ? heading : 'Content'}
    />
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
