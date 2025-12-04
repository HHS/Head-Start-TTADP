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
  TRAINING_REPORT_STATUSES,
  ALL_STATES_FLATTENED,
} from '@ttahub/common';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Label,
  Dropdown,
  Fieldset,
  Radio,
  TextInput,
  Button,
  Textarea,
} from '@trussworks/react-uswds';
import { sortBy } from 'lodash';
import MultiSelect from '../../../components/MultiSelect';
import FormItem from '../../../components/FormItem';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import ReadOnlyField from '../../../components/ReadOnlyField';
import selectOptionsReset from '../../../components/selectOptionsReset';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import Req from '../../../components/Req';
import UserContext from '../../../UserContext';
import isAdmin from '../../../permissions';
import { EVENT_PARTNERSHIP, TRAINING_EVENT_ORGANIZER } from '../../../Constants';
import useEventAndSessionStaff from '../../../hooks/useEventAndSessionStaff';

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
  TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
  TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
].map((option) => ({ value: option, label: option }));

const EventSummary = ({
  additionalData,
  datePickerKey,
  isAppLoading,
  showSubmitModal,
  onSaveDraft,
}) => {
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
  const eventOrganizer = watch('eventOrganizer');

  const { trainerOptions, optionsForValue } = useEventAndSessionStaff(data, true);

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
    eventName,
    owner,
    status,
  } = data;

  const { user } = useContext(UserContext);

  const hasAdminRights = isAdmin(user);
  const { users: { pointOfContact, creators } } = additionalData;
  const adminCanEdit = hasAdminRights && (status !== TRAINING_REPORT_STATUSES.COMPLETE);
  const ownerName = owner && owner.name ? owner.name : '';

  const getIntendedAudience = (value) => {
    let audience = '';
    if (value) {
      audience = data.eventIntendedAudience.charAt(0).toUpperCase()
              + data.eventIntendedAudience.slice(1);
    }
    return audience;
  };

  const getPointOfContacts = (pocs) => {
    let pocsToDisplay = [];
    if (pocs && pocs.length) {
      pocsToDisplay = pointOfContact.filter(
        (poc) => pocs.includes(poc.id),
      ).map((poc) => poc.fullName);
    }
    return pocsToDisplay.join(', ');
  };

  const getReadOnlyReasons = (reasons) => {
    if (!reasons || reasons.length === 0) {
      return '';
    }
    return reasons.join(', ');
  };

  const getReadOnlyTargetPopulations = (tvalue) => {
    if (!tvalue || tvalue.length === 0) {
      return '';
    }
    return tvalue.join(', ');
  };

  return (
    <div className="bg-white radius-md shadow-2">
      <div className="padding-x-4 padding-y-5">
        <Helmet>
          <title>Event Summary</title>
        </Helmet>
        <h2 className="font-serif-xl margin-0">Event summary</h2>
        <IndicatesRequiredField />
        <div className={adminCanEdit ? 'margin-top-2' : 'margin-top-3 margin-bottom-3'}>
          {adminCanEdit ? (
            <>
              <div className="margin-top-3">
                <FormItem
                  label="Event id "
                  name="eventId"
                  htmlFor="eventId"
                  required
                >
                  <TextInput
                    id="eventId"
                    name="eventId"
                    type="text"
                    required
                    inputRef={register({ required: 'Enter event id' })}
                  />
                </FormItem>
              </div>
              <div className="margin-top-3">
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
              <div className="margin-top-3" data-testid="creator-select">
                <Label htmlFor="ownerId">
                  Event creator
                  <Req />
                </Label>
                <Controller
                  render={({ onChange: controllerOnChange, value: id, onBlur }) => (
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
                      onBlur={onBlur}
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

              <div className="margin-top-3">
                <Label htmlFor="eventOrganizer">
                  Event organizer
                  <Req />
                </Label>
                <Dropdown
                  required
                  id="eventOrganizer"
                  name="eventOrganizer"
                  inputRef={register({ required: 'Select an event organizer' })}
                >
                  {eventOrganizerOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      selected={option.value === data.eventOrganizer}
                    >
                      {option.label}
                    </option>
                  ))}
                </Dropdown>
              </div>

              <div className="margin-top-3" data-testid="additional-states">
                <Label htmlFor="additionalStates">
                  Addtional states involved
                </Label>
                <Controller
                  render={({ onChange: controllerOnChange, value: states, onBlur }) => (
                    <Select
                      value={
                        // ALL_STATES_FLATTENED is array of objects
                        // with value and label properties.
                        // Matches against "Massachusetts (MA)"
                        // instead of "Massachusetts"
                        ALL_STATES_FLATTENED.filter((option) => {
                          if (!states || states.length === 0) {
                            return false;
                          }
                          return states.some(
                            (s) => option.label.includes(s),
                          );
                        })
                      }
                      inputId="additionalStates"
                      name="additionalStates"
                      className="usa-select"
                      styles={selectOptionsReset}
                      components={{
                        DropdownIndicator: null,
                      }}
                      onChange={(s) => {
                        controllerOnChange(s.map((option) => option.label));
                      }}
                      inputRef={register()}
                      options={sortBy(ALL_STATES_FLATTENED, 'label')}
                      onBlur={onBlur}
                      isMulti
                    />
                  )}
                  control={control}
                  name="additionalStates"
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
                <ReadOnlyField label="Event organizer">
                  {data.eventOrganizer}
                </ReadOnlyField>
                <ReadOnlyField label="Additional states involved">
                  {data.additionalStates ? data.additionalStates.join(', ') : ''}
                </ReadOnlyField>
              </>
            )}
        </div>

        <div className="margin-top-3">
          <FormItem
            label="Is this event in partnership with a Head Start Association (HSA)? "
            name="eventPartnership"
            required
            fieldSetWrapper
          >
            <Radio
              id="eventPartnership-regional-hsa"
              name="eventPartnership"
              value={EVENT_PARTNERSHIP.REGIONAL_HSA}
              label="Yes, Regional HSA"
              inputRef={register({ required: 'Select who the event was in partnership with' })}
            />
            <Radio
              id="eventPartnership-state-hsa"
              name="eventPartnership"
              value={EVENT_PARTNERSHIP.STATE_HSA}
              label="Yes, State HSA"
              inputRef={register({ required: 'Select who the event was in partnership with' })}
            />
            <Radio
              id="eventPartnership-no"
              name="eventPartnership"
              value={EVENT_PARTNERSHIP.NO}
              label="No"
              inputRef={register({ required: 'Select who the event was in partnership with' })}
            />
          </FormItem>
        </div>
        <div className="margin-top-3" data-testid="collaborator-select">
          <FormItem
            label="Event collaborators "
            name="collaboratorIds"
            required
          >
            <Controller
              render={({ onChange: controllerOnChange, value, onBlur }) => (
                <Select
                  isMulti
                  value={(optionsForValue).filter((option) => (
                    value.includes(option.name)
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
                  onBlur={onBlur}
                  inputRef={register({ required: 'Select at least one collaborator' })}
                  options={trainerOptions}
                  getOptionLabel={(option) => option.fullName}
                  getOptionValue={(option) => option.id}
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
        <div className={adminCanEdit ? 'margin-top-2' : 'margin-top-2 margin-bottom-3'}>
          { adminCanEdit ? (
            <>
              <div className="margin-top-2">
                <FormItem
                  label="Event region point of contact "
                  name="pocIds"
                  required
                >

                  <Controller
                    render={({ onChange: controllerOnChange, value, onBlur }) => (
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
                        inputRef={register({
                          required:
                            'Select at least one event region point of contact',
                        })}
                        getOptionLabel={(option) => option.fullName}
                        getOptionValue={(option) => option.id}
                        options={pointOfContact}
                        onBlur={onBlur}
                        required
                        isMulti
                      />
                    )}
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (!value || value.length === 0) {
                          return (
                            'Select at least one event region '
                            + 'point of contact'
                          );
                        }
                        return true;
                      },
                    }}
                    name="pocIds"
                    defaultValue={[]}
                  />
                </FormItem>
              </div>
              <Fieldset>
                <div className="margin-top-3">
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
            </>
          ) : (
            <div className="margin-top-3">
              {eventOrganizer !== TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS && (
              <ReadOnlyField label="Event region point of contact">
                {getPointOfContacts(data.pocIds)}
              </ReadOnlyField>
              )}
              <ReadOnlyField label="Event intended audience">
                {getIntendedAudience(data.eventIntendedAudience)}
              </ReadOnlyField>
            </div>
          )}
        </div>

        <div className="margin-top-2 margin-bottom-3 maxw-mobile">
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
        {adminCanEdit ? (
          <>
            <div className="margin-top-2">
              <Label htmlFor="trainingType">
                Training type
                <Req />
              </Label>
              <Dropdown required id="trainingType" name="trainingType" inputRef={register({ required: 'Select a training type' })}>
                <option>Series</option>
                <option>Multi-Day single event</option>
                <option>1 day or less</option>
              </Dropdown>
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
            <div className="margin-top-2">
              <FormItem
                label="Event vision "
                name="vision"
                required
              >
                <Textarea
                  id="vision"
                  name="vision"
                  required
                  inputRef={register({
                    required: 'Describe the event vision',
                  })}
                />
              </FormItem>
            </div>
          </>
        ) : (
          <>
            <ReadOnlyField label="Training type">
              {data.trainingType || 'Series'}
            </ReadOnlyField>
            <ReadOnlyField label="Reasons">
              {getReadOnlyReasons(data.reasons)}
            </ReadOnlyField>
            <ReadOnlyField label="Target populations addressed">
              {getReadOnlyTargetPopulations(data.targetPopulations)}
            </ReadOnlyField>
            <ReadOnlyField label="Event vision">
              {data.vision}
            </ReadOnlyField>
          </>
        )}
        <div className="display-flex margin-top-4">
          <Button id="review-and-submit" className="usa-button--no-margin-top margin-right-1" type="button" disabled={isAppLoading} onClick={() => showSubmitModal()}>Review and submit</Button>
          <Button id="save-draft" className="usa-button--no-margin-top usa-button--outline" type="button" disabled={isAppLoading} onClick={() => onSaveDraft()}>Save draft</Button>
        </div>
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
  isAppLoading: PropTypes.bool.isRequired,
  showSubmitModal: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
};

export default EventSummary;
