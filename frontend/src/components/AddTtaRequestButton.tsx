import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Link } from 'react-router-dom';

interface AddTtaRequestButtonProps {
  label: string;
  /** the new request form to open, which differs by where the button is shown */
  to: string;
}

/**
 * The button that starts a new TTA request. It appears beside the recipient record
 * heading and inside the active requests table's empty state, so both stay in step.
 */
export default function AddTtaRequestButton({
  label,
  to,
}: AddTtaRequestButtonProps): React.ReactElement {
  return (
    <Link to={to} className="usa-button display-inline-flex flex-align-center margin-0">
      <FontAwesomeIcon color="white" icon={faPlus} />
      <span className="margin-x-1">{label}</span>
    </Link>
  );
}
