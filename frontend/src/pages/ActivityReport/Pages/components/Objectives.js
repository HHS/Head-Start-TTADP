import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useWatch, useFieldArray, useFormContext } from 'react-hook-form/dist/index.ie11';
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

  const { errors } = useFormContext();

  // we need to figure out our options based on author/collaborator roles
  const collaborators = useWatch({ name: 'collaborators' });
  const author = useWatch({ name: 'author' });

  // create an exclusive set of roles
  // from the collaborators & author
  const roles = useMemo(() => {
    const collabs = collaborators || [];
    const auth = author || { role: '' };

    return Array.from(
      new Set(
        [...collabs, auth].map(({ role }) => role).flat(),
      ),
    );
  }, [author, collaborators]);

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

      {fields.length < 1
        ? (
          <ObjectiveSelect
            onChange={onSelect}
            options={options}
            selectedObjectives={[]}
          />
        )
        : fields.map((objective, index) => {
          const objectiveErrors = errors[`goal-${goal ? goal.id : 'new'}`]
          && errors[`goal-${goal ? goal.id : 'new'}`].objectives
          && errors[`goal-${goal ? goal.id : 'new'}`].objectives[index]
            ? errors[`goal-${goal ? goal.id : 'new'}`].objectives[index]
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
              errorLabel={goal ? goal.id : 'new'}
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
};
