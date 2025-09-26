import React, { useState } from 'react';
import { Alert, Button } from '@trussworks/react-uswds';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';

export default function LandingMessage() {
  const [showAlert, updateShowAlert] = useState(true);
  const history = useHistory();

  let msg;
  const message = history.location.state && history.location.state.message;
  if (message) {
    msg = (
      <>
        You successfully
        {' '}
        {message.status}
        {' '}
        report
        {' '}
        <Link to={`/activity-reports/${message.reportId}`}>
          {message.displayId}
        </Link>
        {' '}
        on
        {' '}
        {message.time}
      </>
    );
  }

  if (showAlert && message) {
    return (
      <Alert
        type="success"
        role="alert"
        className="margin-bottom-2"
        noIcon
        cta={(
          <Button
            role="button"
            unstyled
            aria-label="dismiss alert"
            onClick={() => updateShowAlert(false)}
          >
            <span className="fa-sm margin-right-2">
              <FontAwesomeIcon color={colors.textInk} icon={faTimesCircle} />
            </span>
          </Button>
            )}
      >
        {msg}
      </Alert>
    );
  }

  return null;
}
