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
    <div
      className={`usa-alert usa-alert--info ${internalLeftMargin} margin-bottom-2`}
      role="status"
    >
      <div className="usa-alert__body">
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
          <p className="usa-alert__text">
            The goal status cannot be changed because{' '}
            {activeActivityReport
              ? activeReportMessage.replace(/^This goal /, 'this goal ')
              : incompleteObjectivesMessage.replace(/^This goal /, 'this goal ')}
          </p>
        )}
      </div>
    </div>
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
