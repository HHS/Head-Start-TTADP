import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@trussworks/react-uswds';
import React from 'react';

interface AddTtaRequestButtonProps {
  label: string;
}

/**
 * The button that starts a new TTA request. It appears beside the recipient record
 * heading and inside the active requests table's empty state, so both stay in step.
 *
 * TODO: give it a destination once the TTA request creation flow exists.
 */
export default function AddTtaRequestButton({
  label,
}: AddTtaRequestButtonProps): React.ReactElement {
  return (
    <Button type="button" className="display-inline-flex flex-align-center margin-0">
      <FontAwesomeIcon color="white" icon={faPlus} />
      <span className="margin-x-1">{label}</span>
    </Button>
  );
}
