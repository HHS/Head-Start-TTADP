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
  recipientType,
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

  const onStepTextChanged = (e, index) => {
    // Adjust Text Area Height If Greater than Default Height.
    const existingHeights = [...heights];
    if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_STEP_HEIGHT) {
      existingHeights[index] = `${e.target.scrollHeight}px`;
      setHeights(existingHeights);
    }
  };

  // istanbul ignore next - Too hard to test
  const onAddNewStep = () => {
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    const canAdd = fieldArray.every((field, index) => {
      if (!field.note) {
        setError(`${name}[${index}].note`, { message: 'Please enter a next step' });
      }

      const parsedDate = isValidDate(field.completeDate);
      if (!field.completeDate || !parsedDate) {
        setError(`${name}[${index}].completeDate`, { message: 'Please enter a valid date' });
      }

      const isValid = !(
        errors[name]?.[index]?.note
        || errors[name]?.[index]?.completeDate
      );

      return isValid;
    });
    if (canAdd) {
      append({ id: null, note: '', completeDate: null });
    }
  };

  const stepType = name === 'specialistNextSteps' ? 'specialist' : 'recipient';
  const recipientLabel = recipientType === 'recipient' ? 'recipient' : 'other entity';

  const dateLabel = (index) => (stepType === 'recipient'
    ? `When does the ${recipientLabel} anticipate completing step ${index + 1}?`
    : `When do you anticipate completing step ${index + 1}?`);

  const textareaRegister = (() => {
    if (required) {
      return register({ required: 'Enter a next step' });
    }
    return register();
  })();

  const showCompleteDateError = (errorsObj, fieldName, idx) => {
    const hasCompleteDateError = (
      errorsObj[fieldName]
      && errorsObj[fieldName][idx]
      && errorsObj[fieldName][idx].completeDate
    );

    return required ? hasCompleteDateError : hasCompleteDateError && errorsObj[fieldName][idx].completeDate?.ref?.value !== '';
  };

  return (
    <>
      <div className="ttahub-next-steps-repeater">
        {fields.map((item, index) => (
          <div key={item.key}>
            <FormGroup
              className="margin-top-2 margin-bottom-2"
              error={(errors[name] && errors[name][index]
                && errors[name][index].note)}
            >
              <Label
                htmlFor={`${stepType}-next-step-${index + 1}`}
              >
                {`Step ${index + 1}`}
                {required && (<Req />)}
              </Label>
              {(errors[name]
                && errors[name][index] && errors[name][index].note)
                ? <ErrorMessage>Enter a next step</ErrorMessage>
                : null}
              <div
                className={`display-flex ${(errors[name] && errors[name][index]
                    && errors[name][index].note) ? 'blank-next-step' : ''}`}
              >
                <Textarea
                  id={`${stepType}-next-step-${index + 1}`}
                  className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                  name={`${name}[${index}].note`}
                  defaultValue={item.note}
                  inputRef={textareaRegister}
                  data-testid={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}NextSteps-input`}
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
              error={showCompleteDateError(errors, name, index)}
            >
              <Label
                htmlFor={`${stepType}-next-step-date-${index + 1}`}
              >
                {dateLabel(index)}
                {required && (<Req announce />)}
              </Label>
              {showCompleteDateError(errors, name, index)
                ? <ErrorMessage>Enter a valid date</ErrorMessage>
                : null}
              <div
                className={showCompleteDateError(errors, name, index) ? 'blank-next-step-date maxw-mobile' : 'maxw-mobile'}
              >
                <ControlledDatePicker
                  inputId={`${stepType}-next-step-date-${index + 1}`}
                  control={control}
                  name={`${name}[${index}].completeDate`}
                  value={item.completeDate}
                  dataTestId={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}StepCompleteDate-input`}
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
        testId={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}NextSteps-button`}
        className="margin-bottom-2"
      />
    </>
  );
}

NextStepsRepeater.propTypes = {
  name: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
  recipientType: PropTypes.string,
  required: PropTypes.bool,
};

NextStepsRepeater.defaultProps = {
  recipientType: '',
  required: true,
};
