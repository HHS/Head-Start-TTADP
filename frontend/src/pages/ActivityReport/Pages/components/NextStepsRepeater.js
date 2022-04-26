import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Button, Textarea, ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { faTrash, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import './NextStepsRepeater.css';

export default function NextStepsRepeater({
  stepType,
  nextSteps,
  setNextSteps,
}) {
  const { register, errors } = useFormContext();

  const [onBlurValidationStates, setOnBlurValidationStates] = useState({});

  const nextStepsWrapper = useRef();
  const addNextStep = () => {
    const newNextStep = [...nextSteps, { id: null, note: '' }];
    setNextSteps(newNextStep);
  };

  const removeNextStep = (i) => {
    const newSteps = [...nextSteps];
    newSteps.splice(i, 1);
    setNextSteps(newSteps);

    // Rebuild Validations Array.
    const rebuiltValidations = {};
    let newIndex = 0;
    newSteps.forEach((s) => {
      if (!s.note) {
        rebuiltValidations[newIndex] = true;
      } else {
        rebuiltValidations[newIndex] = false;
      }
      newIndex += 1;
    });
    setOnBlurValidationStates(rebuiltValidations);
  };

  const updateNextStep = (note, i) => {
 // const updateNextStep = () => {
    console.log('Updated!');
    const newSteps = [...nextSteps];
    const toUpdate = { ...newSteps[i], note };
    newSteps.splice(i, 1, toUpdate);
    setNextSteps(newSteps);
  };

  const validateOnBlur = (note, i) => {
    const existingValidations = { ...onBlurValidationStates };
    if (!note) {
      // Bad validation.
      existingValidations[i] = true;
    } else {
      // Good validation.
      existingValidations[i] = false;
    }
    setOnBlurValidationStates(existingValidations);
  };

  console.log('errors', errors);
  //    onChange={({ target: { value } }) => updateNextStep(value, i)}
  return (
    <>
      <div ref={nextStepsWrapper}>
        <div className="ttahub-next-steps-repeater">
          { nextSteps.map((s, i) => (
            <FormGroup id={`${stepType}-next-steps-form-group-${i + 1}`} key={`${stepType}-next-steps-form-group-${i + 1}`} className="margin-top-1" error={onBlurValidationStates[i] || (errors[`${stepType}-next-steps-text-name-${i + 1}`] && !s.note)}>
              {
                  onBlurValidationStates[i] || (errors[`${stepType}-next-steps-text-name-${i + 1}`] && !s.note)
                    ? <ErrorMessage key={`${stepType}-next-steps-form-group-error-${i + 1}`}>Enter a next step</ErrorMessage>
                    : null
                }
              <div key={`next-step-flex-${i + 1}`} className="display-flex" id="next-steps">
                <Label htmlFor={`next-step-${i + 1}`} className="sr-only">
                  Next step
                  {' '}
                  { i + 1 }
                </Label>
                <Textarea
                  id={`${stepType}-next-steps-text-${i + 1}`}
                  key={`${stepType}-next-steps-text-${i + 1}`}
                  name={`${stepType}-next-steps-text-name-${i + 1}`}
                  className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                  type="text"
                  value={s.note}
                  onChange={({ target: { value } }) => updateNextStep(value, i)}
                  inputRef={register({ required: `${stepType === 'specialist' ? 'Specialist' : "Recipient's"} requires at least one step` })}
                  onBlur={({ target: { value } }) => validateOnBlur(value, i)}
                />
                { nextSteps.length > 1 ? (
                  <Button className="margin-top-0" unstyled type="button" onClick={() => removeNextStep(i)}>
                    <FontAwesomeIcon className="margin-x-1" color="#005ea2" icon={faTrash} />
                    <span className="sr-only">
                      remove step
                      {' '}
                      { i + 1 }
                    </span>
                  </Button>
                ) : null}
              </div>
            </FormGroup>
          ))}
        </div>

        <div className="margin-05 margin-bottom-4">
          <Button type="button" unstyled onClick={addNextStep}>
            <FontAwesomeIcon className="margin-right-1" color="#005ea2" icon={faPlusCircle} />
            Add next step
          </Button>
        </div>
      </div>
    </>
  );
}

NextStepsRepeater.propTypes = {
  stepType: PropTypes.string.isRequired,
  nextSteps: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    value: PropTypes.string,
  })).isRequired,
  setNextSteps: PropTypes.func.isRequired,
};
