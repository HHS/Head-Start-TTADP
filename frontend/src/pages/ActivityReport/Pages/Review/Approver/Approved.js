import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../../utils';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';

const Approved = ({
  additionalNotes,
  approverStatusList,
}) => {
  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');

  return (
    <div className="no-print">
      <h2>Report approved</h2>
      <div className="smart-hub--creator-notes">
        <p>
          <span className="text-bold">Creator notes</span>
        </p>
        <Editor readOnly toolbarHidden defaultEditorState={additionalNotesState} />
      </div>
      <div className="smart-hub--creator-notes margin-top-2 margin-bottom-2">
        <p>
          <span className="text-bold">Manager notes</span>
        </p>
        <DisplayApproverNotes approverStatusList={approverStatusList} />
      </div>
      <div className="margin-top-3">
        <ApproverStatusList approverStatus={approverStatusList} />
      </div>
    </div>
  );
};

Approved.propTypes = {
  additionalNotes: PropTypes.string,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

Approved.defaultProps = {
  additionalNotes: '',
};

export default Approved;
