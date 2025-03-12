import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import { Button, Textarea } from '@trussworks/react-uswds';
import PlusButton from '../GoalForm/PlusButton';
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants';
import FormItem from '../FormItem';
import ReadOnlyField from '../ReadOnlyField';

export default function ObjectivesSection({
  fieldName,
  objectives,
  append,
  remove,
}) {
  const { register } = useFormContext();

  const onAddNewObjectiveClick = () => {
    append({ value: '' });
  };

  return (
    <div className="margin-top-4">
      {(objectives.length > 0) && <h2>Objectives</h2>}
      {objectives.map((field, index) => (
        <div key={field.id}>
          <div hidden={!field.onAR}>
            <ReadOnlyField
              label="TTA objective"
            >
              {field.value}
            </ReadOnlyField>
          </div>
          <div hidden={field.onAR}>
            <FormItem
              label="TTA objective"
              name={`${fieldName}[${index}].value`}
            >
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
      ))}
      <div className="margin-y-4">
        <PlusButton onClick={onAddNewObjectiveClick} text="Add new objective" />
      </div>
    </div>
  );
}

ObjectivesSection.propTypes = {
  fieldName: PropTypes.string,
  objectives: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    value: PropTypes.string,
    onAR: PropTypes.bool,
  })).isRequired,
  append: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
};

ObjectivesSection.defaultProps = {
  fieldName: GOAL_FORM_FIELDS.OBJECTIVES,
};
