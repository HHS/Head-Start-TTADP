import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../../utils';
import ApproverStatusList from '../../components/ApproverStatusList';

import IncompletePages from './IncompletePages';

const NeedsAction = ({
  additionalNotes,
  managerNotes,
  onSubmit,
  approvingManager,
  incompletePages,
  approverStatusList,
}) => {
  const hasIncompletePages = incompletePages.length > 0;

  const submit = async () => {
    if (!hasIncompletePages) {
      await onSubmit({ approvingManagerId: approvingManager.id, additionalNotes });
    }
  };

  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');
  const managerNotesState = getEditorState(managerNotes || 'No manager notes');

  return (
    <>
      <h2>Review and re-submit report</h2>
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
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      <div className="margin-top-3">
        <ApproverStatusList approverStatus={approverStatusList} />
        <Button onClick={submit}>Re-submit for Approval</Button>
      </div>
    </>
  );
};

NeedsAction.propTypes = {
  additionalNotes: PropTypes.string,
  managerNotes: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
  approvingManager: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  }).isRequired,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

NeedsAction.defaultProps = {
  additionalNotes: '',
  managerNotes: '',
};

export default NeedsAction;
