import { Alert } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
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

interface TtaRequestSubmittedAlertProps {
  /** the list the alert is shown on, so the request opens under it */
  requestRoot?: string;
}

/**
 * Says a TTA request was submitted, on the page the form returned the user to. The form puts
 * the message in the location's state; it is taken from there once, so it doesn't show again
 * on a refresh or on coming back to the page.
 */
export default function TtaRequestSubmittedAlert({
  requestRoot,
}: TtaRequestSubmittedAlertProps): React.ReactElement | null {
  const location = useLocation<LocationState>();
  const history = useHistory();
  const [message] = useState(location.state?.message ?? null);

  useEffect(() => {
    if (location.state?.message) {
      // keep whatever else is in the state; the recipient record reads its own flag from it
      const { message: _message, ...restState } = location.state;
      history.replace({ ...location, state: restState });
    }
  }, [history, location]);

  if (!message?.reportId) {
    return null;
  }

  return (
    <Alert type="success" headingLevel="h2" slim role="alert" className="margin-bottom-3">
      You submitted request{' '}
      <Link to={ttaRequestViewPath(message.reportId, requestRoot)}>{message.displayId}</Link> on{' '}
      {message.time}.
    </Alert>
  );
}
