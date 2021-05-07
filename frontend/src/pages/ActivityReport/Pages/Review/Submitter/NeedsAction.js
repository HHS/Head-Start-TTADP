import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Editor } from 'react-draft-wysiwyg';
import { getEditorState } from '../../../../../utils';

import IncompletePages from './IncompletePages';

const NeedsAction = ({
  additionalNotes,
  managerNotes,
  onSubmit,
  approvingManager,
  incompletePages,
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
      <div>
        <div className="margin-top-2">
          <span>
            <FontAwesomeIcon color="red" icon={faInfoCircle} />
          </span>
          {' '}
          <span className="text-bold">Action Requested</span>
          {' '}
          from
          {' '}
          { approvingManager.name }
        </div>
      </div>
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      <div className="margin-top-3">
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
};

NeedsAction.defaultProps = {
  additionalNotes: '',
  managerNotes: '',
};

export default NeedsAction;
