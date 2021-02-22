import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

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

  return (
    <>
      <Alert noIcon className="margin-y-4" type="error">
        <b>
          { approvingManager.name }
          {' '}
          has requested updates to this activity report
        </b>
        <br />
        Please review the manager notes below and re-submit for approval.
      </Alert>
      <h2>Review and re-submit report</h2>
      <div className="smart-hub--creator-notes">
        <p>
          <span className="text-bold">Creator notes</span>
          <br />
          <br />
          { additionalNotes || 'No creator notes' }
        </p>
      </div>
      <div className="smart-hub--creator-notes margin-top-2">
        <p>
          <span className="text-bold">Manager notes</span>
          <br />
          <br />
          { managerNotes }
        </p>
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
          { approvingManager.name || 'No manager notes' }
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
