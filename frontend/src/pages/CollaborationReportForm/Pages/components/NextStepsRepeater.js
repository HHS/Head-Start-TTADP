import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Button, Textarea, ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

import './NextStepsRepeater.scss';
import ControlledDatePicker from '../../../../components/ControlledDatePicker';
import Req from '../../../../components/Req';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { isValidDate } from '../../../../utils';

const DEFAULT_STEP_HEIGHT = 80;

export default function NextStepsRepeater({
  name,
  ariaName,
  required,
}) {
  const [heights, setHeights] = useState([]);

  const {
    register,
    control,
    getValues,
    errors,
    setError,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
  });

  const canDelete = fields.length > 1;

  const onRemoveStep = (index) => {
    // Remove from Array.
    remove(index);

    // Remove Height.
    const updatedHeights = [...heights];
    updatedHeights.splice(index, 1);
    setHeights(updatedHeights);
  };

  // istanbul ignore next - too hard to test heights in jsdom
  const onStepTextChanged = (e, index) => {
    // Adjust Text Area Height If Greater than Default Height.
    const existingHeights = [...heights];
    if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_STEP_HEIGHT) {
      existingHeights[index] = `${e.target.scrollHeight}px`;
      setHeights(existingHeights);
    }
  };

  const onAddNewStep = () => {
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    const canAdd = fieldArray.every((field, index) => {
      if (!field.collabStepDetail) {
        setError(`${name}[${index}].collabStepDetail`, { message: 'Please enter a next step' });
      }

      const parsedDate = isValidDate(field.collabStepCompleteDate);
      if (!field.collabStepCompleteDate || !parsedDate) {
        setError(`${name}[${index}].collabStepCompleteDate`, { message: 'Please enter a valid date' });
      }

      const isValid = !(
        errors[name]?.[index]?.collabStepDetail
        || errors[name]?.[index]?.collabStepCompleteDate
      );

      return isValid;
    });
    if (canAdd) {
      append({ id: null, collabStepDetail: '', collabStepCompleteDate: null });
    }
  };

  const dateLabel = () => 'When do you anticipate completing this step?';

  const textareaRegister = (() => {
    if (required) {
      return register({ required: 'Enter a next step' });
    }
    return register();
  })();

  return (
    <>
      <div className="ttahub-next-steps-repeater">
        {fields.map((item, index) => (
          <div key={item.key}>
            <FormGroup
              className="margin-top-2 margin-bottom-2"
              error={(errors[name] && errors[name][index]
                && errors[name][index].collabStepDetail)}
            >
              <Label
                htmlFor={`next-step-${index + 1}`}
              >
                {`Step ${index + 1}`}
                {required && (<Req />)}
              </Label>
              {(errors[name]
                && errors[name][index] && errors[name][index].collabStepDetail)
                ? <ErrorMessage>Enter a next step</ErrorMessage>
                : null}
              <div
                className={`display-flex ${(errors[name] && errors[name][index]
                    && errors[name][index].collabStepDetail) ? 'blank-next-step' : ''}`}
              >
                <Textarea
                  id={`next-step-${index + 1}`}
                  className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                  name={`${name}[${index}].collabStepDetail`}
                  defaultValue={item.collabStepDetail}
                  inputRef={textareaRegister}
                  data-testid="NextSteps-input"
                  style={{ height: !heights[index] ? `${DEFAULT_STEP_HEIGHT}px` : heights[index] }}
                  onChange={(e) => onStepTextChanged(e, index)}
                  required={required}
                />
                {canDelete ? (
                  <Button
                    className="margin-top-0"
                    unstyled
                    type="button"
                    aria-label={`remove ${ariaName} ${index + 1}`}
                    onClick={() => onRemoveStep(index)}
                  >
                    <FontAwesomeIcon className="margin-x-1" color="#000" icon={faTrash} />
                    <span className="usa-sr-only">
                      remove step
                      {' '}
                      {index + 1}
                    </span>
                  </Button>
                ) : null}
              </div>
            </FormGroup>
            <FormGroup
              className="margin-top-1 margin-bottom-2"
              error={(errors[name] && errors[name][index]
                && errors[name][index].collabStepCompleteDate)}
            >
              <Label
                htmlFor={`next-step-date-${index + 1}`}
              >
                {dateLabel(index)}
                {required && (<Req announce />)}
              </Label>
              {(errors[name] && errors[name][index]
                  && errors[name][index].collabStepCompleteDate)
                ? <ErrorMessage>Enter a valid date</ErrorMessage>
                : null}
              <div
                className={(errors[name] && errors[name][index]
                    && errors[name][index].collabStepCompleteDate) ? 'blank-next-step-date' : ''}
              >
                <ControlledDatePicker
                  inputId={`next-step-date-${index + 1}`}
                  control={control}
                  name={`${name}[${index}].collabStepCompleteDate`}
                  value={item.collabStepCompleteDate}
                  dataTestId="StepcollabStepCompleteDate-input"
                  required={required}
                />
              </div>
            </FormGroup>
          </div>
        ))}
      </div>

      <PlusButton
        onClick={onAddNewStep}
        text="Add next step"
        testId="NextSteps-button"
        className="margin-bottom-2"
      />
    </>
  );
}

NextStepsRepeater.propTypes = {
  name: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
  required: PropTypes.bool,
};

NextStepsRepeater.defaultProps = {
  required: true,
};
