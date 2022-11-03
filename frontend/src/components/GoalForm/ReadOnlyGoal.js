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
      onClick: () => onRemove(goal),
    },
  ];

  if (hideEdit) {
    menuItems = [
      {
        label: 'Remove',
        onClick: () => onRemove(goal),
      },
    ];
  }

  return (
    <div key={`goal${goal.id}`}>
      <div className="ttahub-goal-form-goal-summary padding-3 position-relative margin-bottom-4">
        <h2 className="margin-top-0 margin-bottom-3">Recipient TTA goal</h2>
        <div className="position-absolute pin-top pin-right padding-4">
          <ContextMenu
            label={`Actions for Goal ${goal.id}`}
            menuItems={menuItems}
            menuClassName="width-card"
          />
        </div>
        <h3 className="margin-top-0 margin-bottom-2">Goal summary</h3>
        { goal.grants && goal.grants.length
          ? (
            <div className="margin-bottom-2">
              <h4 className="margin-0">Recipient grant numbers</h4>
              <p className="usa-prose margin-0">{goal.grants.map((grant) => grant.label).join(', ')}</p>
            </div>
          )
          : null }
        <div className="margin-bottom-2">
          <h4 className="margin-0">Goal</h4>
          <p className="usa-prose margin-0">{goal.name}</p>
        </div>
        <div className="margin-bottom-2">
          <h4 className="margin-0">Recipient TTA Plan Agreement (RTTAPA) goal</h4>
          <p className="usa-prose margin-0">{goal.isRttapa}</p>
        </div>
        {goal.endDate ? (
          <div className="margin-bottom-4">
            <h4 className="margin-0">Anticipated close date</h4>
            <p className="usa-prose margin-0">{goal.endDate}</p>
          </div>
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
        ttaProvided: PropTypes.string,
        resources: PropTypes.arrayOf(PropTypes.shape({
          key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          value: PropTypes.string,
        })),
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
    name: PropTypes.string,
    endDate: PropTypes.string,
    isRttapa: PropTypes.string,
  }).isRequired,
};

ReadOnlyGoal.defaultProps = {
  hideEdit: false,
};
