import React, {
  useState,
  useEffect,
  useMemo,
} from 'react';
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
  isMonitoringGoal,
  objectiveOptionsLoaded,
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
    fields ? fields.map(({ id }) => id) : [],
  );

  const onAddNew = () => {
    append({ ...NEW_OBJECTIVE(isMonitoring) });

    // Focus the newest objective's title after adding
    setTimeout(() => {
      const allValues = getValues();
      const fieldArrayGoals = allValues.goalForEditing || [];

      if (!fieldArrayGoals.objectives) return;

      const newIndex = fieldArrayGoals.objectives.length - 1;
      const newObjectiveTitleField = document.getElementById(
        `goalForEditing.objectives[${newIndex}].title`,
      );
      if (newObjectiveTitleField) {
        newObjectiveTitleField.focus();
      }
    }, 0);
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
      // For some reason append was excluding key properties like id and value.
      // This would cause the first objective selected to remain in the available list.
      setValue(fieldArrayName, [...getValues(fieldArrayName) || [], objective]);
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

  // filter out used objectives and return them in a format that react-select understands
  const options = useMemo(() => [
    ...objectiveOptions
      .filter((objective) => !usedObjectiveIds.includes(objective.value))
      .map((objective) => ({
        ...objective,
        label: objective.title,
        value: objective.value,
        isNew: false,
      })),
    NEW_OBJECTIVE(isMonitoring),
  ], [usedObjectiveIds, objectiveOptions, isMonitoring]);

  const firstObjective = fields.length < 1;
  const removeObjective = (index) => {
    // Remove the objective.
    remove(index);
    // Update this list of available objectives.
    setUpdatedUsedObjectiveIds();
  };

  useEffect(() => {
    if (objectiveOptionsLoaded && firstObjective && options && options.length === 1) {
      // Instead of append, you can use setValue to directly set the first objective
      setValue(fieldArrayName, [{ ...NEW_OBJECTIVE(isMonitoring) }]);
    }
  }, [firstObjective, options.length, objectiveOptionsLoaded, isMonitoring, options, setValue]);
  // console.log('objective options: ', objectiveOptions);
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
              isMonitoringGoal={isMonitoringGoal}
              // We don't do the look up here as we might still be loading stuff.
              objectiveOptions={objectiveOptions || []}
            />
          );
        })}
      {firstObjective || (fields.length === 1 && getValues(`${fieldArrayName}[0].title`) === '') ? null : <PlusButton className="margin-bottom-2" text="Add new objective" onClick={onAddNew} /> }
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
  isMonitoringGoal: PropTypes.bool,
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
  objectiveOptionsLoaded: PropTypes.bool.isRequired,
};

Objectives.defaultProps = {
  citationOptions: [],
  rawCitations: [],
  isMonitoringGoal: false,
};
