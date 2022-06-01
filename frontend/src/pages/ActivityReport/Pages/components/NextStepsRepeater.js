import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label, Button, Textarea, ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { faTrash, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import FormItem from '../../../../components/FormItem';
import './NextStepsRepeater.css';
import ControlledDatePicker from '../../../../components/ControlledDatePicker';

const DEFAULT_STEP_HEIGHT = 80;

export default function NextStepsRepeater({
  name,
  ariaName,
}) {
  const [heights, setHeights] = useState([]);
  const [blurStepValidations, setBlurStepValidations] = useState([]);
  const [blurDateValidations, setBlurDateValidations] = useState([]);
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
      append({ id: null, note: '', completeDate: null });
    }
  };

  const onRemoveStep = (index) => {
    // Remove from Array.
    remove(index);

    // Remove Step Validation State.
    const updatedStepBlurValidations = blurStepValidations ? [...blurStepValidations] : [];
    updatedStepBlurValidations.splice(index, 1);
    setBlurStepValidations(updatedStepBlurValidations);

    // Remove Date Validation.
    const updatedDateBlurValidations = blurDateValidations ? [...blurDateValidations] : [];
    updatedDateBlurValidations.splice(index, 1);
    setBlurDateValidations(updatedDateBlurValidations);

    // Remove Height.
    const updatedHeights = [...heights];
    updatedHeights.splice(index, 1);
    setHeights(updatedHeights);
  };

  const validateStepOnBlur = (note, i) => {
    // Set Step Blur Validation State.
    const existingValidations = blurStepValidations ? [...blurStepValidations] : [];
    existingValidations[i] = !note;
    setBlurStepValidations(existingValidations);
  };

  const validateDateOnBlur = (date, i) => {
    // Set Date Blur Validation State.
    const existingDateValidations = blurDateValidations ? [...blurDateValidations] : [];
    existingDateValidations[i] = !date;
    setBlurDateValidations(existingDateValidations);
  };

  const onStepTextChanged = (e, index) => {
    // Adjust Text Area Height If Greater than Default Height.
    const existingHeights = [...heights];
    if (e.target && e.target.scrollHeight && e.target.scrollHeight > DEFAULT_STEP_HEIGHT) {
      existingHeights[index] = `${e.target.scrollHeight}px`;
      setHeights(existingHeights);
    }
  };

  const stepType = name === 'specialistNextSteps' ? 'specialist' : 'recipient';

  return (
    <>
      <div className="ttahub-next-steps-repeater">
        {fields.map((item, index) => (
          <div key={`${stepType}-parent-div-${index + 1}`}>
            <FormItem
              id={`${stepType}-next-steps-form-item-step`}
              key={`${stepType}-next-steps-form-item-step`}
              label={`Step: ${index + 1}`}
              name={`${stepType}NextSteps`}
              fieldSetWrapper
            >
              <FormGroup
                key={`${stepType}-next-step-form-group-step-${index + 1}`}
                className="margin-top-1"
                error={blurStepValidations[index]}
              >
                {blurStepValidations[index] || (errors[name]
                  && errors[name][index] && errors[name][index].note)
                  ? <ErrorMessage>Enter a next step</ErrorMessage>
                  : null}
                <div
                  key={`${stepType}-next-step-flex-step-${index + 1}`}
                  className={`display-flex ${blurStepValidations[index]
                    || (errors[name] && errors[name][index]
                      && errors[name][index].note) ? 'blank-next-step' : ''}`}
                >
                  <Label
                    htmlFor={`${stepType}-next-step-${index + 1}`}
                    className="sr-only"
                  >
                    Next step
                    {' '}
                    {index + 1}
                  </Label>
                  <Textarea
                    key={item.key}
                    id={`${stepType}-next-step-${index + 1}`}
                    className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                    name={`${name}[${index}].note`}
                    type="text"
                    defaultValue={item.note}
                    inputRef={register({ required: 'Enter a next step' })}
                    onBlur={({ target: { value } }) => validateStepOnBlur(value, index)}
                    data-testid={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}NextSteps-input`}
                    style={{ height: !heights[index] ? `${DEFAULT_STEP_HEIGHT}px` : heights[index] }}
                    onChange={(e) => onStepTextChanged(e, index)}
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
                      <span className="sr-only">
                        remove step
                        {' '}
                        {index + 1}
                      </span>
                    </Button>
                  ) : null}
                </div>
              </FormGroup>
            </FormItem>
            <FormItem
              id={`${stepType}-next-steps-form-date-item`}
              key={`${stepType}-next-steps-form-date-item`}
              label="When do you anticipate completing this step?"
              name={`${stepType}NextSteps`}
              fieldSetWrapper
            >
              <FormGroup
                key={`${stepType}-next-step-form-group-date-${index + 1}`}
                className="margin-top-1"
                error={blurDateValidations[index]}
              >
                {blurDateValidations[index]
                || (errors[name] && errors[name][index]
                && errors[name][index].completeDate)
                  ? <ErrorMessage>Enter a complete date</ErrorMessage>
                  : null}
                <div
                  key={`${stepType}-next-step-flex-date-${index + 1}`}
                  className={`${blurDateValidations[index]
                    || (errors[name] && errors[name][index]
                    && errors[name][index].completeDate) ? 'blank-next-step' : ''}`}
                >
                  <Label
                    htmlFor={`${stepType}-next-step-complete-date${index + 1}`}
                    className="sr-only"
                  >
                    Next step complete date
                    {' '}
                    {index + 1}
                  </Label>
                  <ControlledDatePicker
                    key={item.key}
                    id={`${stepType}-next-step-dat-${index + 1}`}
                    control={control}
                    name={`${name}[${index}].completeDate`}
                    value={item.completeDate}
                    onBlur={({ target: { value } }) => validateDateOnBlur(value, index)}
                  />
                </div>
              </FormGroup>
            </FormItem>
          </div>
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
