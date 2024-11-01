import React from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { v4 as uuidv4 } from 'uuid';
import { getEditorState } from '../utils';

export function renderEditor(heading, data) {
  /**
     * sometimes, we may receive JSX
     */
  if (typeof data === 'object') {
    return data;
  }

  let wrapperId = '';

  if (typeof heading === 'string') {
    wrapperId = `${heading.toLowerCase().replace(' ', '-')}-${uuidv4()}`;
  } else {
    wrapperId = uuidv4();
  }

  /**
     * otherwise, we render the contents via react-draft
     */
  const defaultEditorState = getEditorState(data || '');

  return (
    <Editor
      readOnly
      toolbarHidden
      defaultEditorState={defaultEditorState}
      wrapperId={wrapperId}
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
