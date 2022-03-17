import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import './ReadOnly.css';
import ContextMenu from '../ContextMenu';

export default function ReadOnly({
  onEdit,
  onDelete,
  createdGoals,
}) {
  return (
    <>
      { createdGoals.map((goal, index) => {
        const menuItems = [
          {
            label: 'Edit',
            onClick: () => onEdit(goal, index),
          },
          {
            label: 'Delete',
            onClick: async () => onDelete(goal.id),
          },
        ];

        return (
          <div key={`goal${goal.id}`} className="ttahub-goal-form-goal-summary padding-4 margin-y-4 position-relative">
            <h2 className="margin-top-0">Recipient TTA goal</h2>
            <div className="position-absolute pin-top pin-right padding-4">
              <ContextMenu
                label="Goal actions"
                menuItems={menuItems}
              />
            </div>
            <h3>Goal summary</h3>
            <h4 className="margin-bottom-1">Recipient grant numbers</h4>
            { goal.grants.map((g) => <p key={`grant${g.value}`}>{g.label}</p>) }
            <h4 className="margin-bottom-1">Goal</h4>
            <p className="margin-top-0">{goal.name}</p>
            {goal.endDate ? (
              <>
                <h4 className="margin-bottom-1">Goal end date</h4>
                <p className="margin-top-0">{moment(goal.endDate, 'yyyy-mm-dd').format('mm/DD/yyyy')}</p>
              </>
            ) : null }
          </div>
        );
      })}
    </>
  );
}

ReadOnly.propTypes = {
  createdGoals: PropTypes.arrayOf(PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      }),
    ),
    goalName: PropTypes.string,
    endDate: PropTypes.string,
  })).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
