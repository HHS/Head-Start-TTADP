import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { useFormContext, useFieldArray } from 'react-hook-form';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

import Objective from './Objective';
import './Goal.css';

const Goals = ({
  id, name, onRemove, goalIndex,
}) => {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `goals[${goalIndex}].objectives`,
  });

  const removeGoal = () => {
    remove();
    onRemove(id);
  };

  const singleObjective = fields.length === 1;

  useEffect(() => {
    if (fields.length === 0) {
      append({ title: '', ttaProvided: '', status: '' });
    }
  }, [fields, append]);

  return (
    <div className="smart-hub--goal">
      <div className="smart-hub--goal-content">
        <div className="display-flex flex-align-start">
          <p className="margin-top-0">
            <span className="text-bold">Goal: </span>
            { name }
          </p>

          <div>
            <Button onClick={(e) => { e.preventDefault(); removeGoal(); }} unstyled className="smart-hub--button" aria-label={`remove goal ${goalIndex + 1}`}>
              <FontAwesomeIcon color="gray" icon={faTrash} />
            </Button>
          </div>
        </div>
        <div>
          {fields.map((objective, objectiveIndex) => (
            <div className="margin-top-1" key={objective.id}>
              <Objective
                showRemove={!singleObjective}
                remove={remove}
                id={objective.id}
                goalIndex={goalIndex}
                objectiveIndex={objectiveIndex}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => append({
            title: '', ttaProvided: '', status: '',
          })}
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
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  name: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
  goalIndex: PropTypes.number.isRequired,
};

export default Goals;
