import React, {
  useState,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Select from 'react-select';
import {
  TARGET_POPULATIONS,
  EVENT_TARGET_POPULATIONS,
  REASONS,
  TRAINING_REPORT_STATUSES,
} from '@ttahub/common';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Label,
  UswdsSelect,
  Fieldset,
  Radio,
  TextInput,
} from '@trussworks/react-uswds';
import MultiSelect from '../../../components/MultiSelect';
import FormItem from '../../../components/FormItem';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import ReadOnlyField from '../../../components/ReadOnlyField';
import selectOptionsReset from '../../../components/selectOptionsReset';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import Req from '../../../components/Req';
import {
  eventSummaryFields,
  pageComplete,
} from '../constants';
import UserContext from '../../../UserContext';
import isAdmin from '../../../permissions';

const placeholderText = '- Select -';

// Get the first three values in TARGET_POPULATIONS.
const tgtPop = [...TARGET_POPULATIONS];
const firstThree = tgtPop.splice(0, 3);

const targetPopulations = [
  ...tgtPop,
  ...EVENT_TARGET_POPULATIONS,
];

// Sort the reasons alphabetically.
targetPopulations.sort();

// Move the first three values in TARGET_POPULATIONS to the top of the list.
targetPopulations.unshift(...firstThree);

const eventOrganizerOptions = [
  'Regional PD Event (with National Centers)',
  'IST TTA/Visit',
].map((option) => ({ value: option, label: option }));

const EventSummary = ({ additionalData, datePickerKey }) => {
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

  // we store this to cause the end date to re-render when updated by the start date (and only then)
  const [endDateKey, setEndDateKey] = useState('endDate-');

  const setEndDate = (newEnd) => {
    setValue('endDate', newEnd);

    // this will trigger the re-render of the
    // uncontrolled end date input
    // it's a little clumsy, but it does work
    setEndDateKey(`endDate-${newEnd}`);
  };

  const {
    eventId,
    eventName,
    owner,
    status,
  } = data;

  const { user } = useContext(UserContext);

  const hasAdminRights = isAdmin(user);
  const { users: { collaborators, pointOfContact, creators } } = additionalData;

  const ownerName = owner && owner.name ? owner.name : '';

  return (
    <div className="padding-x-1">
      <Helmet>
        <title>Event Summary</title>
      </Helmet>
      <IndicatesRequiredField />

      <ReadOnlyField label="Event ID">
        {eventId}
      </ReadOnlyField>

      {hasAdminRights && (status !== TRAINING_REPORT_STATUSES.COMPLETE) ? (

        <>
          <div className="margin-top-2">
            <FormItem
              label="Event name "
              name="eventName"
              htmlFor="eventName"
              required
            >
              <TextInput
                id="eventName"
                name="eventName"
                type="text"
                required
                inputRef={register({ required: 'Enter event name' })}
              />
            </FormItem>
          </div>
          <div className="margin-top-2" data-testid="creator-select">
            <Label htmlFor="creatorName">
              Creator name
              <Req />
            </Label>
            <Controller
              render={({ onChange: controllerOnChange, value: id }) => (
                <Select
                  value={(creators || []).find((option) => option.id === id)}
                  inputId="ownerId"
                  name="ownerId"
                  className="usa-select"
                  styles={selectOptionsReset}
                  components={{
                    DropdownIndicator: null,
                  }}
                  onChange={(s) => {
                    controllerOnChange(s.id);
                  }}
                  inputRef={register({ required: 'Select an event creator' })}
                  options={creators || []}
                  getOptionLabel={(option) => option.nameWithNationalCenters}
                  getOptionValue={(option) => option.id}
                  required
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
              name="ownerId"
              defaultValue=""
            />
          </div>
        </>
      )
        : (
          <>
            <ReadOnlyField label="Event name">
              {eventName}
            </ReadOnlyField>
            <ReadOnlyField label="Event creator">
              {ownerName}
            </ReadOnlyField>
          </>
        )}

      <div className="margin-top-2">
        <Label htmlFor="eventOrganizer">
          Event organizer
          <Req />
        </Label>
        <Controller
          render={({ onChange: controllerOnChange, value }) => (
            <Select
              value={eventOrganizerOptions.find((option) => option.value === value)}
              inputId="eventOrganizer"
              name="eventOrganizer"
              className="usa-select"
              styles={selectOptionsReset}
              components={{
                DropdownIndicator: null,
              }}
              onChange={(s) => {
                controllerOnChange(s.value);
              }}
              inputRef={register({ required: 'Select an event organizer' })}
              options={eventOrganizerOptions}
              required
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
          defaultValue=""
        />
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Event collaborators "
          name="collaboratorIds"
          required
        >
          <Controller
            render={({ onChange: controllerOnChange, value }) => (
              <Select
                isMulti
                value={collaborators.filter((collaborator) => (
                  value.includes(collaborator.id)
                ))}
                inputId="collaboratorIds"
                name="collaboratorIds"
                className="usa-select"
                styles={selectOptionsReset}
                components={{
                  DropdownIndicator: null,
                }}
                onChange={(s) => {
                  controllerOnChange(s.map((option) => option.id));
                }}
                inputRef={register({ required: 'Select at least one collaborator' })}
                getOptionLabel={(option) => option.nameWithNationalCenters}
                getOptionValue={(option) => option.id}
                options={collaborators}
                required
              />
            )}
            control={control}
            rules={{
              validate: (value) => {
                if (!value || value.length === 0) {
                  return 'Select at least one collaborator';
                }
                return true;
              },
            }}
            name="collaboratorIds"
            defaultValue={[]}
          />

        </FormItem>
      </div>

      <div className="margin-top-2">
        <Label htmlFor="pocIds">
          Event region point of contact
          <Req />
        </Label>
        <Controller
          render={({ onChange: controllerOnChange, value }) => (
            <Select
              value={pointOfContact.filter((option) => (
                value.includes(option.id)
              ))}
              inputId="pocIds"
              name="pocIds"
              className="usa-select"
              styles={selectOptionsReset}
              components={{
                DropdownIndicator: null,
              }}
              onChange={(s) => {
                controllerOnChange(s.map((option) => option.id));
              }}
              inputRef={register({ required: 'Select at least one event region point of contact' })}
              getOptionLabel={(option) => option.fullName}
              getOptionValue={(option) => option.id}
              options={pointOfContact}
              required
              isMulti
            />
          )}
          control={control}
          rules={{
            validate: (value) => {
              if (!value || value.length === 0) {
                return 'Select at least one event region point of contact';
              }
              return true;
            },
          }}
          name="pocIds"
          defaultValue={[]}
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
            key={`startDate-${datePickerKey}`}
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
            key={`${endDateKey}-${datePickerKey}`}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <Label htmlFor="trainingType">
          Training type
          <Req />
        </Label>
        <UswdsSelect required id="trainingType" name="trainingType" inputRef={register({ required: 'Select a training type' })}>
          <option>Series</option>
        </UswdsSelect>
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
            required="Select at least on reason"
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
            required="Select at least one target population"
            options={targetPopulations.map((tp) => ({ value: tp, label: tp }))}
            placeholderText="- Select -"
          />
        </FormItem>
      </div>
    </div>
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
      creators: PropTypes.arrayOf(PropTypes.shape(userProp)),
    }),
  }).isRequired,
  datePickerKey: PropTypes.string.isRequired,
};

const fields = Object.keys(eventSummaryFields);
const path = 'event-summary';
const position = 1;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const values = hookForm.getValues();

  const {
    collaboratorIds,
    pocIds,
    reasons,
    targetPopulations: populations,
  } = values;

  if (!pocIds || !pocIds.length
    || !collaboratorIds || !collaboratorIds.length
    || !reasons || !reasons.length
    || !populations || !populations.length) {
    return false;
  }

  return pageComplete(hookForm, fields);
};

export default {
  position,
  label: 'Event summary',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  render: (
    additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <>
      <EventSummary
        additionalData={additionalData}
        datePickerKey={datePickerKey}
      />
      <Alert />
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
