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

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw } from 'draft-js';
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
const EMPTY_HTML = '<p></p>';

const toHtml = (state) => draftToHtml(convertToRaw(state.getCurrentContent()));

const createEditorState = (html) => {
  if (!html || html === EMPTY_HTML) {
    return EditorState.createEmpty();
  }
  return getEditorState(html);
};

const RichEditor = ({
  ariaLabel, value, onChange, onBlur,
}) => {
  const [editorState, setEditorState] = useState(() => createEditorState(value));
  const lastHtmlRef = useRef(value || '');
  const editorWrapperRef = useRef(null);

  useEffect(() => {
    const incomingHtml = value || '';
    // Check if the editor currently has focus
    const editorHasFocus = editorWrapperRef.current
      && editorWrapperRef.current.contains(document.activeElement);

    // Don't update if the editor has focus - the user's local state is more current
    // than any incoming props during active editing
    if (editorHasFocus) {
      return;
    }

    // Only update if the content has actually changed
    if (incomingHtml !== lastHtmlRef.current) {
      lastHtmlRef.current = incomingHtml;
      setEditorState(createEditorState(incomingHtml));
    }
  }, [value]);

  const handleEditorChange = (state) => {
    setEditorState(state);
    const html = toHtml(state);
    const sanitizedHtml = html === EMPTY_HTML ? '' : html;
    lastHtmlRef.current = sanitizedHtml;
    onChange(sanitizedHtml);
  };

  return (
    <div ref={editorWrapperRef}>
      <Editor
        editorState={editorState}
        onBlur={onBlur}
        spellCheck
        onEditorStateChange={handleEditorChange}
        ariaLabel={ariaLabel}
        handlePastedText={() => false}
        tabIndex="0"
        editorStyle={{ border: '1px solid #565c65', minHeight: BASE_EDITOR_HEIGHT }}
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
    </div>
  );
};

RichEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
};

RichEditor.defaultProps = {
  value: '',
  onBlur: () => {},
};

export default RichEditor;
