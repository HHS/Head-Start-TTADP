import { Alert } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { ttaRequestViewPath } from '../pages/TtaRequestForm/constants';

/** the message the submitting form leaves in the location, shaped as LandingMessage's is */
export interface TtaRequestSubmittedMessage {
  reportId: number;
  displayId: string;
  /** when it was submitted, already formatted, e.g. "06/23/2026 at 11:00 am EDT" */
  time: string;
  status: string;
}

interface LocationState {
  message?: TtaRequestSubmittedMessage | null;
}

/**
 * Says a TTA request was submitted, on the page the form returned the user to. The form puts
 * the message in the location's state; it is taken from there once, so it doesn't show again
 * on a refresh or on coming back to the page.
 */
export default function TtaRequestSubmittedAlert(): React.ReactElement | null {
  const history = useHistory<LocationState>();
  const [message] = useState(history.location.state?.message ?? null);

  useEffect(() => {
    const { state } = history.location;
    if (!state?.message) {
      return;
    }
    const { message: _message, ...restState } = state;
    history.replace({
      ...history.location,
      state: Object.keys(restState).length ? restState : undefined,
    });
  }, [history]);

  if (!message?.reportId) {
    return null;
  }

  return (
    <Alert type="success" headingLevel="h4" slim role="alert" className="margin-bottom-3">
      You submitted request{' '}
      <Link to={ttaRequestViewPath(message.reportId)}>{message.displayId}</Link> on {message.time}.
    </Alert>
  );
}
