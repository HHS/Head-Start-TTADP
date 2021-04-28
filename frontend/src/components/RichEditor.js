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

import React from 'react';
import PropTypes from 'prop-types';
import { Controller } from 'react-hook-form/dist/index.ie11';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

import { getEditorState } from '../utils';

const EMPTY_VALUE_TO_PACIFY_WARNINGS = '';

/**
 * Component that provides basic Rich Text Editor.
 * Has to be used within a FormContext Provider.
 *
 * Args:
 * name: Name of the form item
 * defaultValue: By default we extract what the value should be from the form item name param
 * but there may be times where we want to set it or may not be easily extracted from the form
 * values (eg, nested form items in which we don't know the correct path for)
 * onUpdate: Any extra operations that should be executed when updated
 */
const RichEditor = ({
  name, defaultValue, onUpdate, ariaLabel,
}) => (
  <Controller
    name={name}
    defaultValue={EMPTY_VALUE_TO_PACIFY_WARNINGS}
    render={({ onChange, value }) => {
      let defaultEditorState;
      if (defaultValue || value) {
        defaultEditorState = getEditorState(defaultValue || value);
      }

      const onInternalChange = (currentContentState) => {
        const html = draftToHtml(currentContentState);
        onChange(html);
        if (onUpdate) onUpdate(html);
      };

      return (
        <Editor
          spellCheck
          defaultEditorState={defaultEditorState}
          onChange={onInternalChange}
          ariaLabel={ariaLabel}
          tabIndex="0"
          editorStyle={{ border: '1px solid #565c65', height: '10rem' }}
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
    }}
  />
);

RichEditor.propTypes = {
  name: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func,
  ariaLabel: PropTypes.string,
};

RichEditor.defaultProps = {
  defaultValue: '',
  onUpdate: undefined,
  ariaLabel: undefined,
};

export default RichEditor;
