import React from 'react';
import PropTypes from 'prop-types';

export default function ObjectiveStatusSuspendReason({ status, suspendReason, suspendContext }) {
  if (status === 'Suspended' && suspendReason) {
    return (
      <>
        <p className="usa-prose margin-bottom-0 text-bold">
          Reason suspended
        </p>
        <p className="margin-top-0 usa-prose">
          {suspendReason}
          {suspendContext && (` - ${suspendContext}`)}
        </p>
      </>
    );
  }
  return null;
}

ObjectiveStatusSuspendReason.propTypes = {
  status: PropTypes.string.isRequired,
  suspendReason: PropTypes.string.isRequired,
  suspendContext: PropTypes.string.isRequired,
};
