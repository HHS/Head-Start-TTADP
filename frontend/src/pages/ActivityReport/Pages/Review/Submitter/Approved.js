import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../../utils';
import ApproverStatusList from '../../components/ApproverStatusList';

const Approved = ({
  additionalNotes,
  managerNotes,
  approverStatusList,
}) => {
  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');
  const managerNotesState = getEditorState(managerNotes || 'No manager notes');

  return (
    <div className="no-print">
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
      <div className="margin-top-3">
        <ApproverStatusList approverStatus={approverStatusList} />
      </div>
    </div>
  );
};

Approved.propTypes = {
  additionalNotes: PropTypes.string,
  managerNotes: PropTypes.string,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

Approved.defaultProps = {
  additionalNotes: '',
  managerNotes: '',
};

export default Approved;
