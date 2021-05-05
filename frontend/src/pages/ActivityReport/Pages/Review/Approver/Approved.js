import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../../utils';

const Approved = ({
  additionalNotes,
  managerNotes,
}) => {
  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');
  const managerNotesState = getEditorState(managerNotes || 'No manager notes');

  return (
    <>
      <h2>Report approved</h2>
      <div className="smart-hub--creator-notes">
        <p>
          <span className="text-bold">Creator notes</span>
        </p>
        <Editor readOnly toolbarHidden defaultEditorState={additionalNotesState} />
      </div>
      <div className="smart-hub--creator-notes margin-top-2">
        <p>
          <span className="text-bold">Manager notes</span>
        </p>
        <Editor readOnly toolbarHidden defaultEditorState={managerNotesState} />
      </div>
    </>
  );
};

Approved.propTypes = {
  additionalNotes: PropTypes.string,
  managerNotes: PropTypes.string,
};

Approved.defaultProps = {
  additionalNotes: '',
  managerNotes: '',
};

export default Approved;
