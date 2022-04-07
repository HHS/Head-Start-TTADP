/* istanbul ignore file */
/*
 * Ignoring this file due to how hard it is to test the functionality.
 * The main reason is that the react testing library uses JSDOM, which doesn't
 * support the html attribute `contentEditable` (which the component is built upon)
 *
 * https://github.com/jsdom/jsdom/issues/1670
 *
 * Creating a test that checks it renders properly decreases the test suite below the
 * threshold as well.
*/

import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

import { getEditorState } from '../utils';

const BASE_EDITOR_HEIGHT = '10rem';

/**
 * Component that provides basic Rich Text Editor.
 *
 * Args:
 * ariaLabel: Label describing the editor read by a screen reader
 * value: The value of the Editor
 * onChange: Called whenever there is a change typed in the editor
 */
const RichEditor = ({
  ariaLabel, value, onChange,
}) => {
  const [height, setHeight] = useState(BASE_EDITOR_HEIGHT);

  const editorRef = useRef((ref) => {
    editorRef.current = ref;
    return ref;
  });

  let defaultEditorState;
  if (value) {
    defaultEditorState = getEditorState(value);
  }

  const onInternalChange = (currentContentState) => {
    setHeight(editorRef.current && editorRef.current.scrollHeight ? `${editorRef.current.scrollHeight}px` : BASE_EDITOR_HEIGHT);

    const html = draftToHtml(currentContentState);
    onChange(html);
  };

  return (
    <Editor
      editorRef={editorRef}
      spellCheck
      defaultEditorState={defaultEditorState}
      onChange={onInternalChange}
      ariaLabel={ariaLabel}
      handlePastedText={() => false}
      tabIndex="0"
      editorStyle={{ border: '1px solid #565c65', height: `${height}` }}
      toolbar={{
        options: ['inline', 'blockType', 'list'],
        inline: {
          inDropdown: false,
          className: undefined,
          component: undefined,
          dropdownClassName: undefined,
          options: ['bold', 'italic', 'underline', 'strikethrough'],
        },
        blockType: {
          inDropdown: true,
          options: ['Normal', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
        },
        list: {
          inDrodown: false,
          options: ['unordered', 'ordered'],
        },
      }}
    />
  );
};

RichEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

RichEditor.defaultProps = {
  value: '',
};

export default RichEditor;
