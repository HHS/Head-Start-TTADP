import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import {
  Alert,
} from '@trussworks/react-uswds';
import { Accordion } from '../../../../../components/Accordion';
import { getEditorState } from '../../../../../utils';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';

const Submitted = ({
  additionalNotes,
  approverStatusList,
  reviewItems,
}) => {
  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');

  return (
    <>
      <Alert noIcon className="margin-y-4" type="success">
        <b>Success</b>
        <br />
        This report was successfully submitted for approval
      </Alert>
      {reviewItems && reviewItems.length > 0 && (
        <div className="margin-bottom-3">
          <Accordion bordered items={reviewItems} multiselectable />
        </div>
      )}
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
      <div className="margin-top-205 margin-bottom-3">
        <ApproverStatusList approverStatus={approverStatusList} />
      </div>
    </>
  );
};

Submitted.propTypes = {
  additionalNotes: PropTypes.string,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

Submitted.defaultProps = {
  additionalNotes: '',
};

export default Submitted;
