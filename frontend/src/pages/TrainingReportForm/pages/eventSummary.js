import React, {
  useContext,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Select from 'react-select';
import {
  TARGET_POPULATIONS,
  REASONS,
} from '@ttahub/common';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Label,
  Dropdown,
  Fieldset,
  Radio,
} from '@trussworks/react-uswds';
import MultiSelect from '../../../components/MultiSelect';
import NetworkContext from '../../../NetworkContext';
import FormItem from '../../../components/FormItem';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import ReadOnlyField from '../../../components/ReadOnlyField';
import ConnectionError from '../../../components/ConnectionError';
import selectOptionsReset from '../../../components/selectOptionsReset';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import Req from '../../../components/Req';

const placeholderText = '- Select -';

const EventSummary = ({ additionalData }) => {
  const {
    register,
    control,
    getValues,
    watch,
    setValue,
  } = useFormContext();

  const data = getValues();
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const { connectionActive } = useContext(NetworkContext);

  // we store this to cause the end date to re-render when updated by the start date (and only then)
  const [endDateKey, setEndDateKey] = useState('endDate');

  const setEndDate = (newEnd) => {
    setValue('endDate', newEnd);

    // this will trigger the re-render of the
    // uncontrolled end date input
    // it's a little clumsy, but it does work
    setEndDateKey(`endDate-${newEnd}`);
  };

  const { eventId, eventName } = data;

  // we need to add three additional target populations to the AR target populations list
  const targetPopulations = [
    ...TARGET_POPULATIONS,
    'Children/Families affected by systemic discrimination/bias/exclusion',
    'Children/Families affected by traumatic events',
    'Parents/Families impacted by health disparities',
  ];

  // sort the reasons alphabetically
  targetPopulations.sort();

  const { users: { collaborators, pointOfContact } } = additionalData;

  return (
    <>
      <Helmet>
        <title>Event summary</title>
      </Helmet>
      <IndicatesRequiredField />

      <ReadOnlyField label="Event ID">
        {eventId}
      </ReadOnlyField>

      <ReadOnlyField label="Event name">
        {eventName}
      </ReadOnlyField>

      <div className="margin-top-2">
        <Label htmlFor="eventOrganizer">
          Event organizer
          <Req />
        </Label>
        <Controller
          render={({ onChange: controllerOnChange, value }) => (
            <Select
              value={value}
              id="eventOrganizer"
              inputId="eventOrganizer"
              name="eventOrganizer"
              className="usa-select"
              styles={selectOptionsReset}
              getOptionLabel={(option) => option.fullName}
              getOptionValue={(option) => option.id}
              components={{
                DropdownIndicator: null,
              }}
              onChange={(s) => {
                controllerOnChange(s);
              }}
              inputRef={register({ required: 'Select one' })}
              options={[]}
            />
          )}
          control={control}
          rules={{
            validate: (value) => {
              if (!value || value.length === 0) {
                return 'Select an event organizer';
              }
              return true;
            },
          }}
          name="eventOrganizer"
          defaultValue={[]}
        />
      </div>

      <div className="margin-top-2">
        {!connectionActive ? <ConnectionError /> : null }
        <FormItem
          label="Event collaborators"
          name="eventCollaborators"
          required
        >
          <Controller
            render={({ onChange: controllerOnChange, value }) => (
              <Select
                isMulti
                value={value}
                inputId="eventCollaborators"
                name="eventCollaborators"
                className="usa-select"
                styles={selectOptionsReset}
                components={{
                  DropdownIndicator: null,
                }}
                onChange={(s) => {
                  controllerOnChange(s);
                }}
                inputRef={register({ required: 'Select one' })}
                getOptionLabel={(option) => option.fullName}
                getOptionValue={(option) => option.id}
                options={collaborators}
              />
            )}
            control={control}
            rules={{
              validate: (value) => {
                if (!value || value.length === 0) {
                  return 'Select collaborators';
                }
                return true;
              },
            }}
            name="eventCollaborators"
            defaultValue={[]}
          />

        </FormItem>
      </div>

      <div className="margin-top-2">
        <Label htmlFor="eventRegionPointOfContact">
          Event region point of contact
          <Req />
        </Label>
        <Controller
          render={({ onChange: controllerOnChange, value }) => (
            <Select
              value={value}
              inputId="eventRegionPointOfContact"
              name="eventRegionPointOfContact"
              className="usa-select"
              styles={selectOptionsReset}
              components={{
                DropdownIndicator: null,
              }}
              onChange={(s) => {
                controllerOnChange(s);
              }}
              inputRef={register({ required: 'Select one' })}
              getOptionLabel={(option) => option.fullName}
              getOptionValue={(option) => option.id}
              options={pointOfContact}
            />
          )}
          control={control}
          rules={{
            validate: (value) => {
              if (!value || value.length === 0) {
                return 'Select a point of contact';
              }
              return true;
            },
          }}
          name="eventRegionPointOfContact"
          defaultValue=""
        />
      </div>

      <Fieldset>
        <div className="margin-top-2">
          <FormItem
            label="Event intended audience"
            name="eventIntendedAudience"
            fieldSetWrapper
          >
            <Radio
              id="category-recipients"
              name="eventIntendedAudience"
              label="Recipients"
              value="recipients"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
              required
            />
            <Radio
              id="category-regionalOffice"
              name="eventIntendedAudience"
              label="Regional office/TTA"
              value="regiona-office-tta"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset>
        <div className="margin-top-2">
          <FormItem
            label="Event start date"
            name="startDate"
            id="startDate-label"
            htmlFor="startDate"
          >
            <div
              className="usa-hint"
            >
              mm/dd/yyyy
            </div>
            <ControlledDatePicker
              control={control}
              name="startDate"
              value={startDate}
              setEndDate={setEndDate}
              isStartDate
              inputId="startDate"
              endDate={endDate}
            />
          </FormItem>

          <FormItem
            label="Event end date"
            name="endDate"
            id="endDate-label"
            htmlFor="endDate"
          >
            <div
              className="usa-hint"
            >
              mm/dd/yyyy
            </div>
            <ControlledDatePicker
              control={control}
              name="endDate"
              inputId="endDate"
              value={endDate}
              minDate={startDate}
              key={endDateKey}
            />
          </FormItem>
        </div>
      </Fieldset>

      <div className="margin-top-2">
        <Label htmlFor="trainingType">
          Training type
          <Req />
        </Label>
        <Dropdown id="trainingType" name="trainingType" inputRef={register({ required: 'Select one' })}>
          <option>Series</option>
        </Dropdown>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Reasons"
          name="reasons"
        >
          <MultiSelect
            name="reasons"
            control={control}
            options={REASONS.map((reason) => ({ value: reason, label: reason }))}
            required="Select at least one"
            placeholderText={placeholderText}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Target populations addressed"
          name="targetPopulations"
          required
        >
          <MultiSelect
            name="targetPopulations"
            control={control}
            required="Select at least one"
            options={targetPopulations.map((tp) => ({ value: tp, label: tp, isDisabled: tp === '--------------------' }))}
            placeholderText="- Select -"
          />
        </FormItem>
      </div>
    </>
  );
};

const userProp = {
  id: PropTypes.number,
  name: PropTypes.string,
};

EventSummary.propTypes = {
  additionalData: PropTypes.shape({
    users: PropTypes.shape({
      pointOfContact: PropTypes.arrayOf(PropTypes.shape(userProp)),
      collaborators: PropTypes.arrayOf(PropTypes.shape(userProp)),
    }),
  }).isRequired,
};

const ReviewSection = () => <></>;

export const isPageComplete = (_formData, formState) => {
  const { isValid } = formState;
  if (isValid) {
    return true;
  }

  // todo -
  // validate formData

  return true;
};

const path = 'event-summary';
const position = 1;

export default {
  position,
  label: 'Event summary',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  render: (
    additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
  ) => (
    <>
      <EventSummary additionalData={additionalData} />
      <NavigatorButtons
        isAppLoading={isAppLoading}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        path={path}
        position={position}
        onUpdatePage={onUpdatePage}
      />
    </>
  ),
  isPageComplete,
};
