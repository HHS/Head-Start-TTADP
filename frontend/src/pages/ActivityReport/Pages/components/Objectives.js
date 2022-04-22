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
}) {
  const goal = useWatch({ name: 'goalForEditing' });
  const fieldArrayName = `goal-${goal ? goal.id : 'new'}.objectives`;
  const objectivesForGoal = useWatch({ name: fieldArrayName });
  const defaultValues = objectivesForGoal || [];

  /**
   * we can use the useFieldArray hook from react hook form to
   * dynamically generate fields. this also seems to handle weird recursion
   * errors that I was getting trying to manage existing inputs with
   * watch/setValue
   */
  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    name: fieldArrayName,
    defaultValues,
  });

  const objectiveIds = fields ? fields.map(({ value }) => value) : [];

  const options = [
    NEW_OBJECTIVE(),
    // filter out used objectives and return them in them in a format that react-select understands
    ...objectives.filter((objective) => !objectiveIds.includes(objective.id)).map((objective) => ({
      label: objective.title,
      value: objective.id,
      ...objective,
    })),
  ];

  const onAddNew = () => {
    append(NEW_OBJECTIVE());
  };

  const onSelect = (objective) => {
    // we need to remove the roles: [] when the DB is in shape
    append({ ...objective, roles: [] });
  };

  return (
    <>
      {/*
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
          key={objective.value}
          objective={objective}
          topicOptions={topicOptions}
          options={options}
          errors={[]}
          remove={remove}
          fieldArrayName={fieldArrayName}
          goalId={goal ? goal.id : 'new'}
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
};
