import React from 'react';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@trussworks/react-uswds';

import FormItem from '../../../../components/FormItem';
import Objective from './Objective';
import { validateObjectives } from './objectiveValidator';

const OBJECTIVE_LABEL = 'objectivesWithoutGoals';

const createObjective = () => ({
  title: '', ttaProvided: '', status: 'Not Started', id: uuidv4(), new: true,
});

const ObjectivePicker = () => {
  const {
    watch, setValue, register,
  } = useFormContext();
  const objectives = watch(OBJECTIVE_LABEL);

  register(OBJECTIVE_LABEL, {
    validate: (e) => validateObjectives(e),
  });

  const onRemoveObjective = (index) => {
    const newObjectives = objectives.filter((o, objectiveIndex) => index !== objectiveIndex);
    setValue(OBJECTIVE_LABEL, newObjectives);
  };

  const onUpdateObjective = (index, newObjective) => {
    const newObjectives = [...objectives];
    newObjectives[index] = newObjective;
    setValue(OBJECTIVE_LABEL, newObjectives);
  };

  const singleObjective = objectives.length <= 1;

  return (
    <div>
      <FormItem
        label='Because goals are associated with grantees, there is no "goal" field in this section. You must create at least one objective for this activity.'
        name={OBJECTIVE_LABEL}
        fieldSetWrapper
      >
        {objectives.map((objective, objectiveIndex) => (
          <div className="margin-top-1" key={objective.id}>
            <Objective
              parentLabel={OBJECTIVE_LABEL}
              objectiveAriaLabel={(objectiveIndex + 1).toString()}
              objective={objective}
              onRemove={() => { if (!singleObjective) { onRemoveObjective(objectiveIndex); } }}
              onUpdate={(newObjective) => onUpdateObjective(objectiveIndex, newObjective)}
            />
          </div>
        ))}
      </FormItem>
      <Button
        type="button"
        onClick={() => {
          setValue(OBJECTIVE_LABEL, [...objectives, createObjective()]);
        }}
        outline
        aria-label="add objective"
      >
        Add New Objective
      </Button>
    </div>
  );
};

export default ObjectivePicker;
