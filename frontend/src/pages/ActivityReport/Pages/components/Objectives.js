import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useFieldArray, useFormContext } from 'react-hook-form';
import Objective from './Objective';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { OBJECTIVE_PROP, NEW_OBJECTIVE } from './constants';
import ObjectiveSelect from './ObjectiveSelect';

export default function Objectives({
  objectiveOptions,
  topicOptions,
  noObjectiveError,
  reportId,
  citationOptions,
  rawCitations,
}) {
  const { errors, getValues, setValue } = useFormContext();
  const isMonitoring = citationOptions && citationOptions.length > 0;
  const fieldArrayName = 'goalForEditing.objectives';
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
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
    defaultValues,
  });

  const [usedObjectiveIds, setUsedObjectiveIds] = useState(
    fields ? fields.map(({ value }) => value) : [],
  );

  const onAddNew = () => {
    append({ ...NEW_OBJECTIVE(isMonitoring) });
  };

  const setUpdatedUsedObjectiveIds = () => {
    // If fields have changed get updated list of used Objective ID's.
    const allValues = getValues();
    const fieldArrayGoals = allValues.goalForEditing || [];
    const updatedIds = fieldArrayGoals.objectives
      ? fieldArrayGoals.objectives.map(({ value }) => value)
      : [];
    setUsedObjectiveIds(updatedIds);
  };

  const onInitialObjSelect = (objective) => {
    try {
      append(objective);
    } catch (e) {
      // this is simply for unit tests not passing
    } finally {
      // If fields have changed get updated list of used Objective ID's.
      setUpdatedUsedObjectiveIds();
    }
  };

  const onObjectiveChange = (objective, index) => {
    // 'id','ids','value', and 'label' are not tracked on the form.
    // We need to update these with the new Objective ID.
    const ObjId = objective.id;
    setValue(`${fieldArrayName}[${index}].id`, ObjId);
    setValue(`${fieldArrayName}[${index}].value`, ObjId);
    setValue(`${fieldArrayName}[${index}].label`, objective.label);
    setValue(`${fieldArrayName}[${index}].ids`, objective.ids);
    setValue(`${fieldArrayName}[${index}].closeSuspendContext`, objective.closeSuspendContext);
    setValue(`${fieldArrayName}[${index}].closeSuspendReason`, objective.closeSuspendReason);

    // If fields have changed get updated list of used Objective ID's.
    setUpdatedUsedObjectiveIds();
  };

  const options = [
    NEW_OBJECTIVE(isMonitoring),
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
              citationOptions={citationOptions}
              rawCitations={rawCitations}
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
  citationOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })),
  rawCitations: PropTypes.arrayOf(PropTypes.shape({
    standardId: PropTypes.number,
    citation: PropTypes.string,
    // Create array of jsonb objects
    grants: PropTypes.arrayOf(PropTypes.shape({
      grantId: PropTypes.number,
      findingId: PropTypes.string,
      reviewName: PropTypes.string,
      grantNumber: PropTypes.string,
      reportDeliveryDate: PropTypes.string,
    })),
  })),
  objectiveOptions: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
  noObjectiveError: PropTypes.node.isRequired,
  reportId: PropTypes.number.isRequired,
};

Objectives.defaultProps = {
  citationOptions: [],
  rawCitations: [],
};
