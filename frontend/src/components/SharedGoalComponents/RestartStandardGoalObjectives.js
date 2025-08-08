import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Alert } from '@trussworks/react-uswds';
import PlusButton from '../GoalForm/PlusButton';
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants';
import { CREATE_A_NEW_OBJECTIVE } from './constants';
import ObjectiveSelection from './ObjectiveSelection';

export default function RestartStandardGoalObjectives({
  fieldName,
  options,
}) {
  const { control, watch } = useFormContext();

  const {
    fields: objectives,
    append,
    remove,
  } = useFieldArray({
    control,
    name: fieldName,
  });

  const onAddNewObjectiveClick = () => {
    append({ value: '', objectiveId: null });
  };

  const hasReportedObjectives = objectives.some((objective) => objective.onAR === true);

  const objectivesObserver = watch(fieldName);
  const lastObjective = objectivesObserver[objectives.length - 1] || null;
  const hidePlusButton = objectivesObserver.length && lastObjective && !lastObjective.value;

  const objectiveOptions = [
    ...options.map(({ title, id }) => ({
      value: title,
      label: title,
      objectiveId: id,
    })),
    {
      value: CREATE_A_NEW_OBJECTIVE,
      label: CREATE_A_NEW_OBJECTIVE,
      objectiveId: null,
    },
  ];

  return (
    <div className={hidePlusButton ? 'margin-top-4 padding-bottom-3' : 'margin-top-4'}>
      {(objectives.length > 0)
        && <h2>Objectives</h2>}
      {hasReportedObjectives
        && (
          <Alert
            type="info"
            slim
            className="margin-top-3 margin-bottom-2"
          >
            Objectives used on reports cannot be edited.
          </Alert>
        )}
      {objectives.map((field, index) => (
        <ObjectiveSelection
          key={field.id}
          field={field}
          index={index}
          remove={remove}
          fieldName={fieldName}
          objectiveOptions={objectiveOptions}
        />
      ))}
      {!(hidePlusButton) && (
      <div className="margin-y-4">
        <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective" />
      </div>
      )}
    </div>
  );
}

RestartStandardGoalObjectives.propTypes = {
  fieldName: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
  })),
};

RestartStandardGoalObjectives.defaultProps = {
  fieldName: GOAL_FORM_FIELDS.OBJECTIVES,
  options: [],
};
