import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form/dist/index.ie11';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

import Objective from './Objective';
import './Goal.css';

const Goals = ({
  name, onRemoveGoal, goalIndex, objectives, onUpdateObjectives, createObjective,
}) => {
  const { unregister } = useFormContext();
  const onRemoveObjective = (index) => {
    const newObjectives = objectives.filter((o, objectiveIndex) => index !== objectiveIndex);
    onUpdateObjectives(newObjectives);
  };

  const onLocalRemoveGoal = () => {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < objectives.length; i++) {
      unregister(`goals[${goalIndex}].objectives[${i}].ttaProvided`);
    }
    onRemoveGoal();
  };

  const onUpdateObjective = (index, newObjective) => {
    const newObjectives = [...objectives];
    newObjectives[index] = newObjective;
    onUpdateObjectives(newObjectives);
  };
  const singleObjective = objectives.length === 1;

  return (
    <div className="smart-hub--goal">
      <div className="smart-hub--goal-content">
        <div className="display-flex flex-align-start">
          <p className="margin-top-0">
            <span className="text-bold">Goal: </span>
            { name }
          </p>

          <div className="margin-left-auto">
            <Button type="button" onClick={onLocalRemoveGoal} unstyled className="smart-hub--button" aria-label={`remove goal ${goalIndex + 1}`}>
              <FontAwesomeIcon color="black" icon={faTrash} />
            </Button>
          </div>
        </div>
        <div>
          {objectives.map((objective, objectiveIndex) => (
            <div className="margin-top-1" key={objective.id}>
              <Objective
                goalIndex={goalIndex}
                objectiveIndex={objectiveIndex}
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
  goalIndex: PropTypes.number.isRequired,
  onRemoveGoal: PropTypes.func.isRequired,
  onUpdateObjectives: PropTypes.func.isRequired,
};

export default Goals;
