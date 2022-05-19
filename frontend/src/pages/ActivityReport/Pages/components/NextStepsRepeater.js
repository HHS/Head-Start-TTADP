import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Button, Textarea, ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { faTrash, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import './NextStepsRepeater.css';

const DEFAULT_STEP_HEIGHT = 80;

export default function NextStepsRepeater({
  name,
  ariaName,
}) {
  const [heights, setHeights] = useState([]);
  const [blurValidations, setBlurValidations] = useState([]);
  const [showAddStepButton, setShowStepButton] = useState(false);

  const {
    register, control, getValues, errors,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
  });

  useEffect(() => {
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    setShowStepButton(fieldArray.every((field) => field.note !== ''));
  }, [fields, getValues, name]);

  const canDelete = fields.length > 1;

  const onAddNewStep = () => {
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    const canAdd = fieldArray.every((field) => field.note !== '');
    if (canAdd) {
      append({ id: null, note: '' });
    }
  };

  const onRemoveStep = (index) => {
    // Remove from Array.
    remove(index);

    // Remove Validation State.
    const updatedBlurValidations = blurValidations ? [...blurValidations] : [];
    updatedBlurValidations.splice(index, 1);
    setBlurValidations(updatedBlurValidations);

    // Remove Height.
    const updatedHeights = [...heights];
    updatedHeights.splice(index, 1);
    setHeights(updatedHeights);
  };

  const validateOnBlur = (note, i) => {
    // Set Blur Validation State.
    const existingValidations = blurValidations ? [...blurValidations] : [];
    existingValidations[i] = !note;
    setBlurValidations(existingValidations);
  };

  const onStepTextChanged = (e, index) => {
    // Adjust Text Area Height If Greater than Default Height.
    const existingHeights = [...heights];
    if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_STEP_HEIGHT) {
      existingHeights[index] = `${e.target.scrollHeight}px`;
      setHeights(existingHeights);
    }
  };

  return (
    <>
      <div className="ttahub-next-steps-repeater">
        { fields.map((item, index) => (
          <FormGroup
            key={`next-step-form-group-${index + 1}`}
            className="margin-top-1"
            error={blurValidations[index]}
          >
            {
                blurValidations[index] || (errors[name] && errors[name][index])
                  ? <ErrorMessage>Enter a next step</ErrorMessage>
                  : null
                }
            <div
              key={`next-step-flex-${index + 1}`}
              className={`display-flex ${blurValidations[index] || (errors[name] && errors[name][index]) ? 'blank-next-step' : ''}`}
            >
              <Label
                htmlFor={`${name === 'specialistNextSteps'
                  ? 'specialist' : 'recipient'}-next-step-${index + 1}`}
                className="sr-only"
              >
                Next step
                {' '}
                { index + 1 }
              </Label>
              <Textarea
                key={item.key}
                id={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}-next-step-${index + 1}`}
                className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                name={`${name}[${index}].note`}
                type="text"
                defaultValue={item.note}
                inputRef={register({ required: 'Enter a next step' })}
                onBlur={({ target: { value } }) => validateOnBlur(value, index)}
                data-testid={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}NextSteps-input`}
                style={{ height: !heights[index] ? `${DEFAULT_STEP_HEIGHT}px` : heights[index] }}
                onChange={(e) => onStepTextChanged(e, index)}
              />
              { canDelete ? (
                <Button
                  className="margin-top-0"
                  unstyled
                  type="button"
                  aria-label={`remove ${ariaName} ${index + 1}`}
                  onClick={() => onRemoveStep(index)}
                >
                  <FontAwesomeIcon className="margin-x-1" color="#000" icon={faTrash} />
                  <span className="sr-only">
                    remove step
                    {' '}
                    { index + 1 }
                  </span>
                </Button>
              ) : null}
            </div>
          </FormGroup>
        ))}
      </div>

      <div className="margin-05 margin-bottom-4">
        {
          showAddStepButton
            ? (
              <Button
                type="button"
                unstyled
                onClick={onAddNewStep}
                data-testid={
                   `${name === 'specialistNextSteps'
                     ? 'specialist' : 'recipient'}NextSteps-button`
                   }
              >
                <FontAwesomeIcon className="margin-right-1" color="#005ea2" icon={faPlusCircle} />
                Add next step
              </Button>
            )
            : null

                  }
      </div>
    </>
  );
}

NextStepsRepeater.propTypes = {
  name: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
};
