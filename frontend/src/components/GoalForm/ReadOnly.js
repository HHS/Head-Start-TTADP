import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../ContextMenu';
import Modal from '../Modal';
import ReadOnlyObjective from './ReadOnlyObjective';
import './ReadOnly.scss';

export default function ReadOnly({
  onEdit,
  onDelete,
  createdGoals,
  hideEdit,
}) {
  const modalRef = useRef();

  return (
    <>
      { createdGoals.map((goal, index) => {
        let menuItems = [
          {
            label: `Edit goal ${goal.id}`,
            onClick: () => onEdit(goal, index),
          },
          {
            label: `Delete goal ${goal.id}`,
            onClick: () => modalRef.current.toggleModal(true),
          },
        ];

        if (hideEdit) {
          menuItems = [
            {
              label: `Delete goal ${goal.id}`,
              onClick: () => modalRef.current.toggleModal(true),
            },
          ];
        }

        return (
          <div key={`goal${goal.id}`}>
            <Modal
              modalRef={modalRef}
              title="Delete this goal"
              modalId={`goal${goal.id}Modal`}
              onOk={async () => onDelete(goal.id)}
              okButtonText="Delete"
            >
              <>
                <span>Are you sure you want to delete this goal?</span>
                <br />
                <span>This action cannot be undone.</span>
              </>
            </Modal>
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
              <h4 className="margin-bottom-1">Recipient grant numbers</h4>
              {/* todo - fix this <p>{goal.grant.label}</p> */}
              <h4 className="margin-bottom-1">Goal</h4>
              <p className="margin-top-0">{goal.goalName}</p>
              {goal.endDate ? (
                <>
                  <h4 className="margin-bottom-1">Estimated close date</h4>
                  <p className="margin-top-0">{goal.endDate}</p>
                </>
              ) : null }
              { goal.objectives.map((objective) => (
                <ReadOnlyObjective key={`read-only-objective-${objective.id}`} objective={objective} />
              ))}
            </div>
          </div>
        );
      })}
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
  onDelete: PropTypes.func.isRequired,
  hideEdit: PropTypes.bool,
};

ReadOnly.defaultProps = {
  hideEdit: false,
};
