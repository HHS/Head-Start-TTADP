import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Button, Fieldset, Dropdown, ErrorMessage,
} from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../../utils';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';
import IncompletePages from './IncompletePages';
import UserContext from '../../../../../UserContext';

const NeedsAction = ({
  additionalNotes,
  onSubmit,
  incompletePages,
  approverStatusList,
  creatorRole,
}) => {
  const hasIncompletePages = incompletePages.length > 0;
  const { user } = useContext(UserContext);
  const userHasOneRole = user && user.role && user.role.length === 1;
  const [submitCR, setSubmitCR] = useState(!creatorRole && userHasOneRole ? user.role[0] : creatorRole || '');
  const [showCreatorRoleError, setShowCreatorRoleError] = useState(false);

  const submit = async () => {
    if (!submitCR) {
      setShowCreatorRoleError(true);
    } else if (!hasIncompletePages) {
      await onSubmit({
        approvers: approverStatusList,
        additionalNotes,
        creatorRole: submitCR,
      });
    }
  };

  const creatorRoleChange = (e) => {
    setSubmitCR(e.target.value);
    setShowCreatorRoleError(false);
  };

  const additionalNotesState = getEditorState(additionalNotes || 'No creator notes');
  return (
    <>
      <h2>Review and re-submit report</h2>
      <div className="margin-bottom-2">
        {
          !userHasOneRole
            ? (
              <>
                <span className="text-bold">Creator role</span>
                <span className="smart-hub--form-required"> (Required)</span>
                <FormGroup error={showCreatorRoleError}>
                  <Fieldset>
                    {showCreatorRoleError
                      ? <ErrorMessage>Please select a creator role.</ErrorMessage> : null}
                    <Dropdown
                      id="creatorRole"
                      name="creatorRole"
                      value={submitCR}
                      onChange={creatorRoleChange}
                    >
                      <option name="default" value="" disabled hidden>- Select -</option>
                      {user.role.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </Dropdown>
                  </Fieldset>
                </FormGroup>
              </>
            )
            : null
        }
      </div>
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
        <DisplayApproverNotes approverStatusList={approverStatusList} />
      </div>
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      <div className="margin-top-3">
        <ApproverStatusList approverStatus={approverStatusList} />
        <Button className="margin-bottom-4" onClick={submit}>Re-submit for Approval</Button>
      </div>
    </>
  );
};

NeedsAction.propTypes = {
  additionalNotes: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
  creatorRole: PropTypes.string,
};

NeedsAction.defaultProps = {
  additionalNotes: '',
  creatorRole: null,
};

export default NeedsAction;
