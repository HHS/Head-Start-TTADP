import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../ContextMenu';
import ReadOnlyObjective from './ReadOnlyObjective';
import './ReadOnly.scss';

export default function ReadOnlyGoal({
  onEdit,
  onRemove,
  hideEdit,
  goal,
  index,
}) {
  let menuItems = [
    {
      label: 'Edit',
      onClick: () => onEdit(goal, index),
    },
    {
      label: 'Remove',
      onClick: () => onRemove(goal.id),
    },
  ];

  if (hideEdit) {
    menuItems = [
      {
        label: 'Remove',
        onClick: () => onRemove(goal.id),
      },
    ];
  }
  return (
    <div key={`goal${goal.id}`}>
      <div className="ttahub-goal-form-goal-summary padding-4 margin-y-4 position-relative">
        <h2 className="margin-top-0">Recipient TTA goal</h2>
        <div className="position-absolute pin-top pin-right padding-4">
          <ContextMenu
            label={`Actions for Goal ${goal.id}`}
            menuItems={menuItems}
            menuClassName="width-card"
          />
        </div>
        <h3>Goal summary</h3>
        { goal.grants && goal.grants.length
          ? (
            <>
              <h4 className="margin-bottom-1">Recipient grant numbers</h4>
              <p>{goal.grants.map((grant) => grant.label).join(', ')}</p>
            </>
          )
          : null }
        <h4 className="margin-bottom-1">Goal</h4>
        <p className="margin-top-0">{goal.goalName}</p>
        {goal.endDate ? (
          <>
            <h4 className="margin-bottom-1">Anticipated close date</h4>
            <p className="margin-top-0">{goal.endDate}</p>
          </>
        ) : null }
        { goal.objectives.map((objective) => (
          <ReadOnlyObjective key={`read-only-objective-${objective.id}`} objective={objective} />
        ))}
      </div>
    </div>
  );
}

ReadOnlyGoal.propTypes = {
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  hideEdit: PropTypes.bool,
  index: PropTypes.number.isRequired,
  goal: PropTypes.shape({
    id: PropTypes.number,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      }),
    ),
    objectives: PropTypes.arrayOf(
      PropTypes.shape({
        roles: PropTypes.arrayOf(PropTypes.string),
        ttaProvided: PropTypes.string,
        resources: PropTypes.arrayOf(PropTypes.string),
        topics: PropTypes.arrayOf(PropTypes.shape({
          label: PropTypes.string,
        })),
        files: PropTypes.arrayOf(PropTypes.shape({
          originalFileName: PropTypes.string,
          fileSize: PropTypes.number,
          status: PropTypes.string,
          url: PropTypes.shape({
            url: PropTypes.string,
          }),
        })),
        title: PropTypes.string,
        id: PropTypes.number,
        status: PropTypes.string,
      }),
    ),
    goalName: PropTypes.string,
    endDate: PropTypes.string,
  }).isRequired,
};

ReadOnlyGoal.defaultProps = {
  hideEdit: false,
};
