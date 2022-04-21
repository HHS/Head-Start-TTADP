import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import Objective from './Objective';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { OBJECTIVE_PROP, NEW_OBJECTIVE } from './constants';
import ObjectiveSelect from './ObjectiveSelect';

export default function Objectives({
  goal, objectives, topicOptions, objectiveErrors,
}) {
  const { objectives: selectedObjectives } = goal;
  const { setValue } = useFormContext();
  const options = [
    NEW_OBJECTIVE,
    ...objectives.map((objective) => ({
      label: objective.title,
      value: objective.id,
      ...objective,
    })),
  ];

  const onAdd = (objective) => {
    const goalToUpdate = { ...goal };
    goalToUpdate.objectives = [...goalToUpdate.objectives, objective];
    setValue('goalForEditing', goalToUpdate);
  };

  const onAddNew = () => {
    onAdd(NEW_OBJECTIVE);
  };

  const onChange = (objective) => {
    const goalToUpdate = { ...goal };
    goalToUpdate.objectives = [{ ...objective }];
    setValue('goalForEditing', goalToUpdate);
  };

  return (
    <>
      { /*

          we show this picker only when there aren't any objectives selected
          afterwards, it does something slightly different and is shown within
          each objective

        */}
      {selectedObjectives.length < 1
        ? (
          <ObjectiveSelect
            onChange={onChange}
            options={options}
            selectedObjectives={[]}
          />
        ) : null }
      {selectedObjectives.map((objective, index) => (
        <Objective
          key={objective.id}
          objective={objective}
          topicOptions={topicOptions}
          onChange={onChange}
          options={options}
          selectedObjectives={selectedObjectives}
          errors={objectiveErrors[index]}
        />
      ))}
      <PlusButton text="Add new objective" onClick={onAddNew} />
    </>
  );
}

Objectives.propTypes = {
  goal: PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
    objectives: PropTypes.arrayOf(
      OBJECTIVE_PROP,
    ),
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  objectives: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  objectiveErrors: PropTypes.arrayOf(PropTypes.string).isRequired,
};
