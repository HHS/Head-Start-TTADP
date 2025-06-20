import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { getEditorState } from '../utils';

const ReadOnlyEditor = ({ value, ariaLabel }) => {
  const editorState = getEditorState(value);

  return (
    <Editor
      readOnly
      toolbarHidden
      defaultEditorState={editorState}
      ariaLabel={ariaLabel}
    />
  );
};

ReadOnlyEditor.propTypes = {
  value: PropTypes.string,
  ariaLabel: PropTypes.string.isRequired,
};

ReadOnlyEditor.defaultProps = {
  value: '',
};

export default ReadOnlyEditor;
