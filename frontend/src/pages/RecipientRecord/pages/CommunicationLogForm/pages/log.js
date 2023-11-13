import React from 'react';
import PropTypes from 'prop-types';
import { Button, TextInput } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';
import FormItem from '../../../../../components/FormItem';
import ControlledDatePicker from '../../../../../components/ControlledDatePicker';

const Log = ({ datePickerKey }) => {
  const {
    // getValues,
    register,
    watch,
    // setValue,
    control,
    // formState: { errors },
    // setError,
  } = useFormContext();

  const communicationDate = watch('communicationDate');

  return (
    <>
      <IndicatesRequiredField />
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
    </>
  );
};

Log.propTypes = {
  datePickerKey: PropTypes.string.isRequired,
};

const fields = [];
const path = 'log';
const position = 1;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = () => true; // pageComplete(hookForm, fields);

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
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <Log />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
