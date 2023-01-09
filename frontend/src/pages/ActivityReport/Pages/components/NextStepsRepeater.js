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
import Req from '../../../../components/Req';

const DEFAULT_STEP_HEIGHT = 80;

export default function NextStepsRepeater({
  name,
  ariaName,
  recipientType,
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

  const onAddNewStep = () => {
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    const canAdd = fieldArray.every((field, index) => {
      if (!field.note) {
        setError(`${name}[${index}].note`, { message: 'Please enter a next step' });
      }

      if (!(field.completeDate && moment(field.completeDate, 'MM/DD/YYYY').isValid())) {
        setError(`${name}[${index}].completeDate`, { message: 'Please enter a valid date' });
      }

      const isValid = (() => {
        if (errors[name] && errors[name][index] && errors[name][index].note) {
          return false;
        }

        if (errors[name] && errors[name][index] && errors[name][index].completeDate) {
          return false;
        }

        return true;
      })();

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
    : `When do you anticipate completing specialist's step ${index + 1}?`);

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
                aria-label={`${stepType}'s next Step ${index + 1}`}
              >
                {`Step ${index + 1}`}
                {' '}
                <Req doNotRead />
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
                  inputRef={register({ required: 'Enter a next step' })}
                  data-testid={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}NextSteps-input`}
                  style={{ height: !heights[index] ? `${DEFAULT_STEP_HEIGHT}px` : heights[index] }}
                  onChange={(e) => onStepTextChanged(e, index)}
                  required
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
              error={(errors[name] && errors[name][index]
                && errors[name][index].completeDate)}
            >
              <Label
                htmlFor={`${stepType}-next-step-date-${index + 1}`}
              >
                {dateLabel(index)}
                {' '}
                <Req doNotRead />
              </Label>
              {(errors[name] && errors[name][index]
                  && errors[name][index].completeDate)
                ? <ErrorMessage>Enter a valid date</ErrorMessage>
                : null}
              <div
                className={(errors[name] && errors[name][index]
                    && errors[name][index].completeDate) ? 'blank-next-step-date' : ''}
              >
                <ControlledDatePicker
                  inputId={`${stepType}-next-step-date-${index + 1}`}
                  control={control}
                  name={`${name}[${index}].completeDate`}
                  value={item.completeDate}
                  dataTestId={`${name === 'specialistNextSteps' ? 'specialist' : 'recipient'}StepCompleteDate-input`}
                  required
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
  recipientType: PropTypes.string,
};

NextStepsRepeater.defaultProps = {
  recipientType: '',
};
