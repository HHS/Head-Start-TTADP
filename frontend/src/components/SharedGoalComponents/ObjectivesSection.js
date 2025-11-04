import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button, Textarea, Alert } from '@trussworks/react-uswds';
import PlusButton from '../GoalForm/PlusButton';
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants';
import FormItem from '../FormItem';
import ReadOnlyField from '../ReadOnlyField';

export default function ObjectivesSection({
  fieldName,
}) {
  const { register, control } = useFormContext();

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

  return (
    <div className="margin-top-4" data-testid="objectives-section">
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
      {objectives.map((field, index) => {
        const isReadOnly = field.onAR === true;
        return (
          <div key={field.id}>
            <div hidden={!isReadOnly}>
              <ReadOnlyField
                label="TTA objective"
              >
                {field.value}
              </ReadOnlyField>
              {
              (field.onAR === false) && (
                <Button
                  type="button"
                  className="margin-top-1"
                  unstyled
                  onClick={() => {
                    remove(index);
                  }}
                >
                  Remove this objective
                </Button>
              )
              }
            </div>
            <div hidden={isReadOnly}>
              <FormItem
                label="TTA objective"
                name={`${fieldName}[${index}].value`}
              >
                <input
                  type="hidden"
                  // eslint-disable-next-line react/jsx-props-no-spreading
                  {...register(`${fieldName}[${index}].objectiveId`)}
                  defaultValue={field.objectiveId}
                />
                <Textarea
                  name={`${fieldName}[${index}].value`}
                  id={`${fieldName}[${index}].value`}
                  className="margin-bottom-1"
                  inputRef={register()}
                  defaultValue={field.value}
                />
              </FormItem>
              <Button
                type="button"
                unstyled
                onClick={() => {
                  remove(index);
                }}
              >
                Remove this objective
              </Button>
            </div>
          </div>
        );
      })}
      <div className="margin-y-4">
        <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective22" />
      </div>
    </div>
  );
}

ObjectivesSection.propTypes = {
  fieldName: PropTypes.string,
};

ObjectivesSection.defaultProps = {
  fieldName: GOAL_FORM_FIELDS.OBJECTIVES,
};
