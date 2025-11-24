import React from 'react';
import PropTypes from 'prop-types';
import ReadOnlyGoal from './ReadOnlyGoal';
import './ReadOnly.scss';

export default function ReadOnly({
  onEdit,
  onRemove,
  createdGoals,
  hideEdit,
}) {
  return (
    <>
      { createdGoals.map((goal, index) => (
        <div key={`read-only-goal-${goal.id}`}>
          <ReadOnlyGoal
            onEdit={onEdit}
            onRemove={onRemove}
            hideEdit={hideEdit}
            goal={goal}
            index={index}
          />
        </div>
      ))}
    </>
  );
}

ReadOnly.propTypes = {
  createdGoals: PropTypes.arrayOf(PropTypes.shape({
    grant:
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      }),
    goalName: PropTypes.string,
    endDate: PropTypes.string,
  })).isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  hideEdit: PropTypes.bool,
};

ReadOnly.defaultProps = {
  hideEdit: false,
};
