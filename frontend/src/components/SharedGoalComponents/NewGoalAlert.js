import React from 'react';
import PropTypes from 'prop-types';
import { GOAL_STATUS } from '@ttahub/common';

const CloseSuspendNewGoalAlert = ({ goalStatus, goalStatusReason }) => {
  let prefix = '';
  if (goalStatusReason) {
    prefix = `The reason for closing the goal was "${goalStatusReason}"`;
  }

  return (
    <div>
      <p className="usa-prose margin-top-0">
        You have chosen an existing goal with a status of
        {' '}
        {goalStatus}
        .
        {prefix}
        {' '}
        You can:
      </p>
      <ul className="usa-list">
        <li>Reopen this goal and change the status to in progress</li>
        <li>Go back to create a new goal</li>
      </ul>
    </div>
  );
};
const NewGoalAlert = ({ goalStatusReason, goalStatus }) => {
  if (goalStatus === GOAL_STATUS.CLOSED || goalStatus === GOAL_STATUS.SUSPENDED) {
    return <CloseSuspendNewGoalAlert goalStatus={goalStatus} goalStatusReason={goalStatusReason} />;
  }

  return (
    <div>
      <p>
        You have chosen an existing goal with a status of
        {' '}
        {goalStatus || 'not started'}
        . You can either use the goal or go back to create a new goal.
      </p>
    </div>
  );
};

const props = {
  goalStatus: PropTypes.string,
  goalStatusReason: PropTypes.string,
};

const defaultProps = {
  goalStatus: '',
  goalStatusReason: '',
};

NewGoalAlert.propTypes = props;
NewGoalAlert.defaultProps = defaultProps;
CloseSuspendNewGoalAlert.propTypes = props;
CloseSuspendNewGoalAlert.defaultProps = defaultProps;

export default NewGoalAlert;
