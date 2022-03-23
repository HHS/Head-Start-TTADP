import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import './ReadOnly.css';
import ContextMenu from '../ContextMenu';
import Modal from '../Modal';

export default function ReadOnly({
  onEdit,
  onDelete,
  createdGoals,
}) {
  const modalRef = useRef();

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
            onClick: () => modalRef.current.toggleModal(true),
          },
        ];

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
              { goal.objectives.map((objective) => (
                <div key={`objective${objective.id}`}>
                  <h3>Objective summary</h3>
                  <h4 className="margin-bottom-1">Objective</h4>
                  <p className="margin-top-0">{objective.title}</p>
                  <h4 className="margin-bottom-1">Topics</h4>
                  <p className="margin-top-0">{objective.topics.map((topic) => topic.label).join('; ')}</p>
                  <h4 className="margin-bottom-1">Resource link</h4>
                  <ul className="usa-list usa-list--unstyled">
                    { objective.resources.map((resource) => (
                      <li key={resource.key}>{resource.value}</li>
                    ))}
                  </ul>
                </div>
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
