import React from 'react';
import PropTypes from 'prop-types';
import { useWatch, useFieldArray } from 'react-hook-form/dist/index.ie11';
import Objective from './Objective';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { OBJECTIVE_PROP, NEW_OBJECTIVE } from './constants';
import ObjectiveSelect from './ObjectiveSelect';

export default function Objectives({
  objectives,
  topicOptions,
  objectiveErrors,
  // noObjectiveError,
}) {
  const goal = useWatch({ name: 'goalForEditing' });
  // const { setValue } = useFormContext();
  const { fields, append, update } = useFieldArray({
    name: `${goal ? goal.id : 'new'}.objectives`,
    defaultValues: [NEW_OBJECTIVE],
  });

  const options = [
    NEW_OBJECTIVE,
    ...objectives.map((objective) => ({
      label: objective.title,
      value: objective.id,
      ...objective,
    })),
  ];

  const onAddNew = () => {
    // onAdd(NEW_OBJECTIVE);
    append(NEW_OBJECTIVE);
  };

  const onSelect = (objective) => {
    append(objective);
  };

  return (
    <>
      { /*
          we show this picker only when there aren't any objectives selected
          afterwards, it does something slightly different and is shown within
          each objective
        */}

      {fields.length < 1
        ? (
          <ObjectiveSelect
            onChange={onSelect}
            options={options}
            selectedObjectives={[]}
          />
        )
        : null }

      {fields.map((objective, index) => (
        <Objective
          index={index}
          key={objective.id}
          objective={objective}
          topicOptions={topicOptions}
          options={options}
          selectedObjectives={[]}
          errors={objectiveErrors[index]}
          update={update}
        />
      ))}
      <PlusButton text="Add new objective" onClick={onAddNew} />
    </>
  );
}

Objectives.propTypes = {
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  objectives: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  objectiveErrors: PropTypes.arrayOf(PropTypes.string).isRequired,
  // noObjectiveError: PropTypes.node.isRequired,
};
