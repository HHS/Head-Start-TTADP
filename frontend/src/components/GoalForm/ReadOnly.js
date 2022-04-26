import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Editor } from 'react-draft-wysiwyg';
import ContextMenu from '../ContextMenu';
import Modal from '../Modal';
import { getEditorState } from '../../utils';
import './ReadOnly.css';

const TTAProvided = ({ tta }) => {
  const defaultEditorState = getEditorState(tta);
  return (
    <>
      <h4 className="margin-bottom-1">TTA provided</h4>
      <Editor
        readOnly
        className="margin-top-0"
        toolbarHidden
        defaultEditorState={defaultEditorState}
      />
    </>
  );
};

TTAProvided.propTypes = {
  tta: PropTypes.string.isRequired,
};
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
            label: `Edit goal ${goal.id}`,
            onClick: () => onEdit(goal, index),
          },
          {
            label: `Delete goal ${goal.id}`,
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
              {goal.grants.length ? <h4 className="margin-bottom-1">Recipient grant numbers</h4> : null }
              { goal.grants.map((g) => <p key={`grant${g.value}`}>{g.label}</p>) }
              <h4 className="margin-bottom-1">Goal</h4>
              <p className="margin-top-0">{goal.goalName}</p>
              {goal.endDate ? (
                <>
                  <h4 className="margin-bottom-1">Estimated close date</h4>
                  <p className="margin-top-0">{goal.endDate}</p>
                </>
              ) : null }
              { goal.objectives.map((objective) => (
                <div key={`objective${objective.id}`}>
                  <h3>Objective summary</h3>
                  <h4 className="margin-bottom-1">Objective</h4>
                  <p className="margin-top-0">{objective.title}</p>

                  {objective.topics && objective.topics.length
                    ? (
                      <>
                        <h4 className="margin-bottom-1">Topics</h4>
                        <p className="margin-top-0">{objective.topics.map((topic) => topic.label).join('; ')}</p>
                      </>
                    ) : null }

                  {objective.resources && objective.resources.length
                    ? (
                      <>
                        <h4 className="margin-bottom-1">Resource links</h4>
                        <ul className="usa-list usa-list--unstyled">
                          { objective.resources.map((resource) => (
                            <li key={resource.key}>{resource.value}</li>
                          ))}
                        </ul>
                      </>
                    )
                    : null }

                  {objective.roles && objective.roles.length
                    ? (
                      <>
                        <h4 className="margin-bottom-1">Specialist roles</h4>
                        <ul className="usa-list usa-list--unstyled">
                          { objective.roles.map((role) => (
                            <li key={role}>{role}</li>
                          ))}
                        </ul>
                      </>
                    )
                    : null }

                  {objective.ttaProvided ? <TTAProvided tta={objective.ttaProvided} /> : null}
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
