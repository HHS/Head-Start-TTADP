import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import {
  Alert, Button,
} from '@trussworks/react-uswds';
import { getEditorState } from '../../../../../utils';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';

const NotEditableAlert = () => (
  <Alert type="warning" noIcon slim className="margin-bottom-1 no-print">
    <b>Caution:</b>
    {' '}
    Report has been submitted to manager(s) for approval.
    <br />
    If you wish to update this report,
    please check with your manager before clicking &quot;Reset to Draft&quot;.
  </Alert>
);

const Submitted = ({
  additionalNotes,
  resetToDraft,
  approverStatusList,
}) => {
  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');

  return (
    <>
      <Alert noIcon className="margin-y-4" type="success">
        <b>Success</b>
        <br />
        This report was successfully submitted for approval
      </Alert>
      <div className="smart-hub--creator-notes margin-bottom-3">
        <p>
          <span className="text-bold">Creator notes</span>
        </p>
        <Editor readOnly toolbarHidden defaultEditorState={additionalNotesState} />
      </div>
      <div className="smart-hub--creator-notes margin-top-2">
        <p>
          <span className="text-bold">Manager notes</span>
        </p>
        <DisplayApproverNotes approverStatusList={approverStatusList} />
      </div>
      <div className="margin-top-205">
        <ApproverStatusList approverStatus={approverStatusList} />
      </div>
      <NotEditableAlert />
      <div className="margin-top-3">
        <Button type="button" onClick={resetToDraft}>Reset to Draft</Button>
      </div>
    </>
  );
};

Submitted.propTypes = {
  additionalNotes: PropTypes.string,
  resetToDraft: PropTypes.func.isRequired,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

Submitted.defaultProps = {
  additionalNotes: '',
};

export default Submitted;
