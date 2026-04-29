import { Alert } from '@trussworks/react-uswds';
import React from 'react';
import './ConnectionError.css';

export default function ConnectionError() {
  return (
    <Alert type="warning" className="ttahub-connection-error margin-top-4 margin-bottom-0">
      Connection error. Cannot load options.
    </Alert>
  );
}
