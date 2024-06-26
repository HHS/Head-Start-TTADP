import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { COMMUNICATION_METHODS, COMMUNICATION_PURPOSES, COMMUNICATION_RESULTS } from '@ttahub/common';
import {
  Button,
  TextInput,
  Label,
  Select,
  Textarea,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';
import FormItem from '../../../../../components/FormItem';
import ControlledDatePicker from '../../../../../components/ControlledDatePicker';
import {
  pageComplete,
  defaultLogValues,
} from '../constants';
import ReadOnlyField from '../../../../../components/ReadOnlyField';
import UserContext from '../../../../../UserContext';

const fields = Object.keys(defaultLogValues);

const Log = ({ datePickerKey }) => {
  const {
    register,
    watch,
    control,
  } = useFormContext();

  const { user } = useContext(UserContext);
  const communicationDate = watch('communicationDate');
  const authorName = watch('author.name');

  return (
    <>
      <IndicatesRequiredField />
      <input type="hidden" name="author.name" ref={register()} />
      <div className="margin-top-2">
        <ReadOnlyField label="Creator name">
          {authorName || user.name}
        </ReadOnlyField>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Date of communication"
          name="communicationDate"
          id="communicationDate-label"
          htmlFor="communicationDate"
          required
        >
          <div
            className="usa-hint"
          >
            mm/dd/yyyy
          </div>
          <ControlledDatePicker
            key={`communicationDate-${datePickerKey}`}
            control={control}
            name="communicationDate"
            value={communicationDate}
            inputId="communicationDate"
          />
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="Duration in hours (round to the nearest quarter hour) "
          name="duration"
        >
          <div className="maxw-card-lg">
            <TextInput
              id="duration"
              name="duration"
              type="number"
              min={0}
              max={99.5}
              step={0.25}
              inputRef={
                register({
                  required: 'Enter duration',
                  valueAsNumber: true,
                  validate: {
                    mustBeQuarterHalfOrWhole: (value) => {
                      if (value % 0.25 !== 0) {
                        return 'Duration must be rounded to the nearest quarter hour';
                      }
                      return true;
                    },
                  },
                  min: { value: 0.25, message: 'Duration must be greater than 0 hours' },
                  max: { value: 99, message: 'Duration must be less than or equal to 99 hours' },
                })
              }
              required
            />
          </div>
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="How was the communication conducted? "
          name="method"
        >
          <Select
            required
            id="method"
            name="method"
            inputRef={register({ required: 'Select a communication method' })}
          >
            {COMMUNICATION_METHODS.map((option) => (
              <option key={`methodoptions${option}`}>{option}</option>
            ))}
          </Select>
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="Purpose of communication "
          name="purpose"
        >
          <Select
            required
            id="purpose"
            name="purpose"
            inputRef={register({ required: 'Select a purpose of communication' })}
          >
            {COMMUNICATION_PURPOSES.map((option) => (
              <option key={`purposeoptions${option}`}>{option}</option>
            ))}
          </Select>
        </FormItem>
      </div>
      <div className="margin-top-2">
        <Label htmlFor="notes">
          Notes
        </Label>
        <Textarea
          name="notes"
          id="notes"
          inputRef={register()}
        />
      </div>
      <div className="margin-top-2">
        <FormItem
          label="Result"
          name="result"
          required={false}
        >
          <Select
            id="result"
            name="result"
            inputRef={register()}
            defaultValue=""
          >
            <option value="" disabled hidden>Select one</option>
            {COMMUNICATION_RESULTS.map((option) => (
              <option key={`resultOptions${option}`}>{option}</option>
            ))}
          </Select>
        </FormItem>
      </div>
    </>
  );
};

Log.propTypes = {
  datePickerKey: PropTypes.string.isRequired,
};

const path = 'log';
const position = 1;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

export default {
  position,
  label: 'Communication log',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    _onSaveDraft,
    _onUpdatePage,
    _weAreAutoSaving,
    datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <Log datePickerKey={datePickerKey} />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
