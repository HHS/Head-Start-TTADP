import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useFieldArray, useFormContext } from 'react-hook-form/dist/index.ie11';
import Objective from './Objective';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { OBJECTIVE_PROP, NEW_OBJECTIVE } from './constants';
import ObjectiveSelect from './ObjectiveSelect';
import { createObjectiveForGoal } from '../../../../fetchers/goals';
import AppLoadingContext from '../../../../AppLoadingContext';

export default function Objectives({
  objectiveOptions,
  topicOptions,
  noObjectiveError,
  reportId,
  goalIds,
  regionId,
}) {
  const { errors, getValues, setValue } = useFormContext();
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const fieldArrayName = 'goalForEditing.objectives';
  const objectivesForGoal = getValues(fieldArrayName);
  const defaultValues = objectivesForGoal || [];

  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    name: fieldArrayName,
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
    defaultValues,
  });

  const [usedObjectiveIds, setUsedObjectiveIds] = useState(
    fields ? fields.map(({ value }) => value) : [],
  );

  const setUpdatedUsedObjectiveIds = () => {
    // If fields have changed get updated list of used Objective ID's.
    const allValues = getValues();
    const fieldArrayGoals = allValues.goalForEditing || [];
    const updatedIds = fieldArrayGoals.objectives
      ? fieldArrayGoals.objectives.map(({ value }) => value)
      : [];
    setUsedObjectiveIds(updatedIds);
  };

  const onObjectiveChange = (objective, index) => {
    // 'id','ids','value', and 'label' are not tracked on the form.
    // We need to update these with the new Objective ID.
    const objectiveId = objective.id;
    setValue(`${fieldArrayName}[${index}].id`, objectiveId);
    setValue(`${fieldArrayName}[${index}].value`, objectiveId);
    setValue(`${fieldArrayName}[${index}].label`, objective.label);
    setValue(`${fieldArrayName}[${index}].ids`, objective.ids);

    // If fields have changed get updated list of used Objective ID's.
    setUpdatedUsedObjectiveIds();
  };

  const onAddNew = async () => {
    let newObjective = {};
    if (goalIds) {
      try {
        setIsAppLoading(true);
        // create a new objective for the DB
        newObjective = await createObjectiveForGoal(goalIds, regionId);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setIsAppLoading(false);
      }
    }

    // when we return, update the form with the new objective
    append({ ...NEW_OBJECTIVE(), ...newObjective });

    onObjectiveChange(newObjective, fields.length - 1);
    setUpdatedUsedObjectiveIds();
  };

  const onInitialObjSelect = async (objective) => {
    // this will be undefined at the end of the day if
    // the user didn't select "Create a new objective"
    let newObjective;

    // let's check to see if "Create a new objective" was selected
    if (objective.value === 'new') {
      // if so, the backend WILL BE INVOLVED
      try {
        setIsAppLoading(true);
        newObjective = await createObjectiveForGoal(goalIds, regionId);
      } catch (e) {
        // fail gracefully using boilerplate data
        newObjective = NEW_OBJECTIVE();
      } finally {
        setIsAppLoading(false);
      }
    }

    const objectiveToAppend = newObjective || objective;

    append(objectiveToAppend);
    onObjectiveChange(objectiveToAppend, fields.length - 1);
    setUpdatedUsedObjectiveIds();
  };

  const options = [
    NEW_OBJECTIVE(),
    // filter out used objectives and return them in them in a format that react-select understands
    ...objectiveOptions.filter((objective) => !usedObjectiveIds.includes(objective.value)).map(
      (objective) => ({
        ...objective,
        label: objective.title,
        value: objective.value,
        isNew: false,
      }),
    ),
  ];

  const removeObjective = (index) => {
    // Remove the objective.
    remove(index);
    // Update this list of available objectives.
    setUpdatedUsedObjectiveIds();
  };

  const firstObjective = fields.length < 1;
  return (
    <>
      {/*
        we show this picker only when there aren't any objectives selected
        afterwards, it does something slightly different and is shown within
        each objective
      */}

      {firstObjective
        ? (
          <ObjectiveSelect
            onChange={onInitialObjSelect}
            options={options}
            selectedObjectives={[]}
            noObjectiveError={noObjectiveError}
          />
        )
        : fields.map((objective, index) => {
          const objectiveErrors = errors.goalForEditing
          && errors.goalForEditing.objectives
          && errors.goalForEditing.objectives[index]
            ? errors.goalForEditing.objectives[index]
            : {};

          return (
            <Objective
              index={index}
              key={objective.key}
              objective={objective}
              topicOptions={topicOptions}
              options={options}
              errors={objectiveErrors}
              remove={removeObjective}
              fieldArrayName={fieldArrayName}
              onObjectiveChange={onObjectiveChange}
              parentGoal={getValues('goalForEditing')}
              initialObjectiveStatus={objective.status}
              reportId={reportId}
            />
          );
        })}
      {firstObjective ? null : <PlusButton text="Add new objective" onClick={onAddNew} /> }
    </>
  );
}

Objectives.propTypes = {
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  objectiveOptions: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  noObjectiveError: PropTypes.node.isRequired,
  reportId: PropTypes.number.isRequired,
  goalIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
  regionId: PropTypes.number.isRequired,
};

Objectives.defaultProps = {
  goalIds: [],
};
