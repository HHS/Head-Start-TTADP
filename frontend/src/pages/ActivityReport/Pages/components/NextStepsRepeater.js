import React, { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  FormGroup, Label, Button, Textarea, ErrorMessage,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faPlusCircle } from '@fortawesome/pro-regular-svg-icons';
import colors from '../../../../colors';
import './NextStepsRepeater.scss';
import ControlledDatePicker from '../../../../components/ControlledDatePicker';
import { DATE_DISPLAY_FORMAT } from '../../../../Constants';

const DEFAULT_STEP_HEIGHT = 80;

export default function NextStepsRepeater({
  name,
  ariaName,
}) {
  const [heights, setHeights] = useState([]);
  const [blurStepValidations, setBlurStepValidations] = useState([]);
  const [blurDateValidations, setBlurDateValidations] = useState([]);

  const todaysDate = moment().format(DATE_DISPLAY_FORMAT);

  const {
    register, control, getValues, errors,
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
    const momentDate = moment(date, 'MM/DD/YYYY');
    existingDateValidations[i] = !date || !momentDate.isValid();
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

  const onAddNewStep = () => {
    validateStepOnBlur();
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    const canAdd = fieldArray.every((field) => field.note !== ''
      && (field.completeDate && moment(field.completeDate, 'MM/DD/YYYY').isValid()));
    if (canAdd) {
      append({ id: null, note: '', completeDate: null });
    }
  };

  const stepType = name === 'specialistNextSteps' ? 'specialist' : 'recipient';

  const dateLabel = (index) => (stepType === 'recipient'
    ? `When does the recipient anticipate completing step ${index + 1}?`
    : `When do you anticipate completing step ${index + 1}?`);

  return (
    <>
      <div className="ttahub-next-steps-repeater">
        {fields.map((item, index) => (
          <div key={item.key}>
            <FormGroup
              className="margin-top-2 margin-bottom-2"
              error={blurStepValidations[index] || (errors[name] && errors[name][index]
                && errors[name][index].note)}
            >
              <Label
                htmlFor={`${stepType}-next-step-${index + 1}`}
              >
                {`Step ${index + 1}`}
                <span className="smart-hub--form-required font-family-sans font-ui-xs text-secondary-dark">
                  {' '}
                  *
                </span>
              </Label>
              {blurStepValidations[index] || (errors[name]
                && errors[name][index] && errors[name][index].note)
                ? <ErrorMessage>Enter a next step</ErrorMessage>
                : null}
              <div
                className={`display-flex ${blurStepValidations[index]
                  || (errors[name] && errors[name][index]
                    && errors[name][index].note) ? 'blank-next-step' : ''}`}
              >
                <Textarea
                  id={`${stepType}-next-step-${index + 1}`}
                  className="height-10 minh-5 smart-hub--text-area__resize-vertical"
                  name={`${name}[${index}].note`}
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
            <FormGroup
              className="margin-top-1 margin-bottom-2"
              error={blurDateValidations[index] || (errors[name] && errors[name][index]
                && errors[name][index].completeDate)}
            >
              <Label
                htmlFor={`${stepType}-next-step-date-${index + 1}`}
              >
                {dateLabel(index)}
                <span className="smart-hub--form-required font-family-sans font-ui-xs text-secondary-dark">
                  {' '}
                  *
                </span>
              </Label>
              {blurDateValidations[index]
                || (errors[name] && errors[name][index]
                  && errors[name][index].completeDate)
                ? <ErrorMessage>Enter a valid date</ErrorMessage>
                : null}
              <div
                className={`${blurDateValidations[index]
                  || (errors[name] && errors[name][index]
                    && errors[name][index].completeDate) ? 'blank-next-step-date' : ''}`}
              >
                <ControlledDatePicker
                  inputId={`${stepType}-next-step-date-${index + 1}`}
                  control={control}
                  name={`${name}[${index}].completeDate`}
                  value={item.completeDate}
                  onBlur={({ target: { value } }) => validateDateOnBlur(value, index)}
                  minDate={todaysDate}
                  dataTestId={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}StepCompleteDate-input`}
                />
              </div>
            </FormGroup>
          </div>
        ))}
      </div>

      <Button
        type="button"
        unstyled
        onClick={onAddNewStep}
        className="ttahub-next-steps__add-step-button margin-bottom-2"
        data-testid={
          `${name === 'specialistNextSteps'
            ? 'specialist' : 'recipient'}NextSteps-button`
        }
      >
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faPlusCircle} />
        Add next step
      </Button>
    </>
  );
}

NextStepsRepeater.propTypes = {
  name: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
};
