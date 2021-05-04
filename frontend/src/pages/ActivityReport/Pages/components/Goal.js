import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Label, TextInput } from '@trussworks/react-uswds';

import Objective from './Objective';
import ContextMenu from '../../../../components/ContextMenu';
import './Goal.css';

const Goals = ({
  name,
  isEditable,
  onRemoveGoal,
  goalIndex,
  onUpdateGoal,
  objectives,
  onUpdateObjectives,
  createObjective,
}) => {
  const [editing, updateEditing] = useState(false);
  const [goalName, updateGoalName] = useState(name);

  const onEditGoal = () => {
    updateEditing(true);
  };

  const onGoalChange = (e) => {
    updateGoalName(e.target.value);
  };

  const handleGoalUpdate = () => {
    onUpdateGoal(goalName);
    updateEditing(false);
  };

  const onRemoveObjective = (index) => {
    const newObjectives = objectives.filter((o, objectiveIndex) => index !== objectiveIndex);
    onUpdateObjectives(newObjectives);
  };

  const onUpdateObjective = (index, newObjective) => {
    const newObjectives = [...objectives];
    newObjectives[index] = newObjective;
    onUpdateObjectives(newObjectives);
  };
  const singleObjective = objectives.length === 1;

  const menuLabel = `Actions for goal ${goalIndex + 1}`;
  const editMenuItem = {
    label: 'Edit',
    onClick: onEditGoal,
  };

  let menuItems = [
    {
      label: 'Remove',
      onClick: onRemoveGoal,
    },
  ];

  if (isEditable) {
    menuItems = [editMenuItem, ...menuItems];
  }

  const InplaceGoalEditor = (
    <div>
      <Label>
        Edit goal
        <TextInput name="goalName" value={goalName} onChange={onGoalChange} />
      </Label>
      <button type="button" className="usa-button" onClick={() => handleGoalUpdate()}>
        Update Goal
      </button>
      <button type="button" onClick={() => updateEditing(false)} className="usa-button usa-button--secondary">
        Cancel
      </button>
    </div>
  );

  const GoalDisplay = (
    <p className="margin-y-0">
      <span className="text-bold">Goal: </span>
      { name }
    </p>
  );

  return (
    <div className="smart-hub--goal">
      <div className="smart-hub--goal-content">
        <div className="display-flex flex-align-center flex-justify margin-y-2">
          {editing
            ? InplaceGoalEditor
            : GoalDisplay}
          <div className="margin-y-0">
            <ContextMenu menuItems={menuItems} label={menuLabel} />
          </div>
        </div>
        <div>
          {objectives.map((objective, objectiveIndex) => (
            <div className="margin-top-1" key={objective.id}>
              <Objective
                parentLabel="goals"
                objectiveAriaLabel={`${objectiveIndex + 1} on goal ${goalIndex + 1}`}
                objective={objective}
                onRemove={() => { if (!singleObjective) { onRemoveObjective(objectiveIndex); } }}
                onUpdate={(newObjective) => onUpdateObjective(objectiveIndex, newObjective)}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => {
            onUpdateObjectives([...objectives, createObjective()]);
          }}
          outline
          aria-label={`add objective to goal ${goalIndex + 1}`}
        >
          Add New Objective
        </Button>
      </div>

    </div>
  );
};

Goals.propTypes = {
  objectives: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    ttaProvided: PropTypes.string,
    status: PropTypes.string,
    new: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })).isRequired,
  createObjective: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  isEditable: PropTypes.bool.isRequired,
  goalIndex: PropTypes.number.isRequired,
  onUpdateGoal: PropTypes.func.isRequired,
  onRemoveGoal: PropTypes.func.isRequired,
  onUpdateObjectives: PropTypes.func.isRequired,
};

export default Goals;
