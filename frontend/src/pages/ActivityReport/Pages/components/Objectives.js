import React from 'react';
import PropTypes from 'prop-types';
import { useFieldArray, useFormContext } from 'react-hook-form/dist/index.ie11';
import Objective from './Objective';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { OBJECTIVE_PROP, NEW_OBJECTIVE } from './constants';
import ObjectiveSelect from './ObjectiveSelect';

export default function Objectives({
  objectives,
  topicOptions,
  roles,
  goalId,
}) {
  const { errors, getValues } = useFormContext();

  const fieldArrayName = `goal-${goalId}.objectives`;
  const objectivesForGoal = getValues(fieldArrayName);
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
    const defaultRoles = roles.length === 1 ? roles : [];
    append({ ...NEW_OBJECTIVE(), roles: defaultRoles });
  };

  const onSelect = (objective) => {
    const defaultRoles = roles.length === 1 ? roles : objective.roles;
    append({ ...objective, roles: defaultRoles });
  };

  return (
    <>
      {/*
        we show this picker only when there aren't any objectives selected
        afterwards, it does something slightly different and is shown within
        each objective
      */}

      <h1>{goalId}</h1>

      {fields.length < 1
        ? (
          <ObjectiveSelect
            onChange={onSelect}
            options={options}
            selectedObjectives={[]}
          />
        )
        : fields.map((objective, index) => {
          const objectiveErrors = errors[`goal-${goalId}`]
          && errors[`goal-${goalId}`].objectives
          && errors[`goal-${goalId}`].objectives[index]
            ? errors[`goal-${goalId}`].objectives[index]
            : {};

          return (
            <Objective
              index={index}
              key={objective.value}
              objective={objective}
              topicOptions={topicOptions}
              options={options}
              errors={objectiveErrors}
              remove={remove}
              fieldArrayName={fieldArrayName}
              errorLabel={goalId}
              roles={roles}
            />
          );
        })}
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
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  goalId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
};
