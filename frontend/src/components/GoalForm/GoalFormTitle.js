import PropTypes from 'prop-types';
import React from 'react';

const GoalFormTitle = ({ goalNumbers, isReopenedGoal }) => {
  const formTitle =
    goalNumbers && goalNumbers.length && !isReopenedGoal
      ? `Goal ${goalNumbers.join(', ')}`
      : 'Recipient TTA goal';
  return <h2 className="font-serif-xl margin-0">{formTitle}</h2>;
};

GoalFormTitle.propTypes = {
  goalNumbers: PropTypes.arrayOf(PropTypes.string),
  isReopenedGoal: PropTypes.bool,
};

GoalFormTitle.defaultProps = {
  goalNumbers: [],
  isReopenedGoal: false,
};

export default GoalFormTitle;
