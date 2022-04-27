import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Button, Textarea, ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { faTrash, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import './NextStepsRepeater.css';

export default function NextStepsRepeater({
  name,
  ariaName,
}) {
  const [onBlurValidationStates, setOnBlurValidationStates] = useState({});
  const {
    register, control, getValues, errors,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
  });

  const canDelete = fields.length > 1;

  const onAddNewStep = () => {
    append({ id: null, note: '' });
  };

  const onRemoveStep = (index) => {
    remove(index);

    // Rebuild Blur Validation States.
    const rebuiltValidations = {};
    let newIndex = 0;
    const allValues = getValues();
    const newSteps = allValues[name] || [];
    newSteps.forEach((s) => {
      rebuiltValidations[newIndex] = !s.note;
      newIndex += 1;
    });
    setOnBlurValidationStates(rebuiltValidations);
  };

  const validateOnBlur = (note, i) => {
    const existingValidations = { ...onBlurValidationStates };
    // Set Blur Validation State.
    existingValidations[i] = !note;
    setOnBlurValidationStates(existingValidations);
  };

  return (
    <>
      <div className="ttahub-next-steps-repeater">
        { fields.map((item, index) => (
          <FormGroup
            key={item.key}
            className="margin-top-1"
            error={onBlurValidationStates[index]}
          >
            {
                onBlurValidationStates[index] || (errors[name] && errors[name][index])
                  ? <ErrorMessage>Enter a next step</ErrorMessage>
                  : null
                }
            <div
              key={`next-step-flex-${index + 1}`}
              className={`display-flex ${onBlurValidationStates[index] || (errors[name] && errors[name][index]) ? 'blank-next-step' : ''}`}
            >
              <Label htmlFor={`next-step-${index + 1}`} className="sr-only">
                Next step
                {' '}
                { index + 1 }
              </Label>
              <Textarea
                className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                name={`${name}[${index}].note`}
                type="text"
                defaultValue={item.note}
                inputRef={register({ required: 'Enter a next step' })}
                onBlur={({ target: { value } }) => validateOnBlur(value, index)}
              />
              { canDelete ? (
                <Button
                  className="margin-top-0"
                  unstyled
                  type="button"
                  aria-label={`remove ${ariaName} ${index + 1}`}
                  onClick={() => onRemoveStep(index)}
                >
                  <FontAwesomeIcon className="margin-x-1" color="#005ea2" icon={faTrash} />
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
        <Button type="button" unstyled onClick={onAddNewStep}>
          <FontAwesomeIcon className="margin-right-1" color="#005ea2" icon={faPlusCircle} />
          Add next step
        </Button>
      </div>
    </>
  );
}

NextStepsRepeater.propTypes = {
  name: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
};
