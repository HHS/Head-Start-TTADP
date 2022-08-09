import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../ContextMenu';
import Modal from '../Modal';
import ReadOnlyObjective from './ReadOnlyObjective';
import './ReadOnly.scss';

export function ReadOnlyGoal({
  onEdit,
  onDelete,
  hideEdit,
  goal,
  index,
}) {
  const modalRef = useRef();
  let menuItems = [
    {
      label: 'Edit',
      onClick: () => onEdit(goal, index),
    },
    {
      label: 'Delete',
      onClick: () => modalRef.current.toggleModal(true),
    },
  ];

  if (hideEdit) {
    menuItems = [
      {
        label: 'Delete',
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
  onDelete: PropTypes.func.isRequired,
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

export default function ReadOnly({
  onEdit,
  onDelete,
  createdGoals,
  hideEdit,
}) {
  return (
    <>
      { createdGoals.map((goal, index) => (
        <div key={`read-only-goal-${goal.id}`}>
          <ReadOnlyGoal
            onEdit={onEdit}
            onDelete={onDelete}
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
  onDelete: PropTypes.func.isRequired,
  hideEdit: PropTypes.bool,
};

ReadOnly.defaultProps = {
  hideEdit: false,
};
