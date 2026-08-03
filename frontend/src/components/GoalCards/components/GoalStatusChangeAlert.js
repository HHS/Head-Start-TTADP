import { Alert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';

export default function GoalStatusChangeAlert({
  invalidStatusChangeAttempted,
  internalLeftMargin,
  activeActivityReport,
  incompleteObjectives,
}) {
  if (!invalidStatusChangeAttempted) {
    return null;
  }

  const activeReportMessage =
    'This goal is on a draft activity report, an activity report that is awaiting approval, or an activity report that needs action.';
  const incompleteObjectivesMessage =
    'This goal has In progress objectives. Update the objective status to complete them.';
  const hasMultipleReasons = activeActivityReport && incompleteObjectives;

  return (
    <Alert
      type="info"
      role="alert"
      validation={hasMultipleReasons}
      className={`${internalLeftMargin} margin-bottom-2`}
    >
      {hasMultipleReasons ? (
        <>
          <p className="usa-alert__text">
            The goal status cannot be changed for the following reasons:
          </p>
          <ul className="usa-list margin-bottom-0">
            <li>{activeReportMessage}</li>
            <li>{incompleteObjectivesMessage}</li>
          </ul>
        </>
      ) : (
        <>
          The goal status cannot be changed because{' '}
          {activeActivityReport
            ? activeReportMessage.replace(/^This goal /, 'this goal ')
            : incompleteObjectivesMessage.replace(/^This goal /, 'this goal ')}
        </>
      )}
    </Alert>
  );
}

GoalStatusChangeAlert.propTypes = {
  internalLeftMargin: PropTypes.string.isRequired,
  invalidStatusChangeAttempted: PropTypes.bool,
  activeActivityReport: PropTypes.bool,
  incompleteObjectives: PropTypes.bool,
};
GoalStatusChangeAlert.defaultProps = {
  invalidStatusChangeAttempted: false,
  activeActivityReport: false,
  incompleteObjectives: false,
};
