import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

const TopAlert = ({
  isNeedsAction,
  approver,
  submitter,
}) => {
  if (isNeedsAction) {
    return (
      <Alert type="error" noIcon slim className="margin-bottom-4 no-print">
        {approver.fullName}
        {' '}
        has requested changes to this session.
        {' '}
        Please review any manager notes below and resubmit for approval.
      </Alert>
    );
  }

  return (
    <Alert type="info" noIcon slim className="margin-bottom-4 no-print">
      <>
        {submitter.fullName}
        {' '}
        has requested approval for this session report.
        {' '}
        Please review all information, then select an approval status.
      </>
    </Alert>
  );
};

TopAlert.propTypes = {
  submitter: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  approver: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
};

export default TopAlert;
