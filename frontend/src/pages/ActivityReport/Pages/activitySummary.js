import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';

import {
  Fieldset, Radio, Label, Grid, TextInput, Checkbox,
} from '@trussworks/react-uswds';

import DatePicker from '../../../components/DatePicker';
import MultiSelect from '../../../components/MultiSelect';

const grantees = [
  'Grantee Name 1',
  'Grantee Name 2',
  'Grantee Name 3',
];

const nonGrantees = [
  'CCDF / Child Care Administrator',
  'Head Start Collaboration Office',
  'QRIS System',
  'Regional Head Start Association',
  'Regional TTA/Other Specialists',
  'State CCR&R',
  'State Early Learning Standards',
  'State Education System',
  'State Health System',
  'State Head Start Association',
  'State Professional Development / Continuing Education',
];

const reasons = [
  'reason 1',
  'reason 2',
];

const otherUsers = [
  'User 1',
  'User 2',
  'User 3',
];

const programTypes = [
  'program type 1',
  'program type 2',
  'program type 3',
  'program type 4',
  'program type 5',
];

const targetPopulations = [
  'target pop 1',
  'target pop 2',
  'target pop 3',
  'target pop 4',
  'target pop 5',
];

const ActivitySummary = ({
  register,
  watch,
  setValue,
  control,
  getValues,
}) => {
  const participantSelection = watch('participantCategory');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const disableParticipant = participantSelection === '';
  const nonGranteeSelected = participantSelection === 'non-grantee';
  const participants = nonGranteeSelected ? nonGrantees : grantees;
  const previousParticipantSelection = useRef(participantSelection);
  const participantLabel = nonGranteeSelected ? 'Non-grantee name(s)' : 'Grantee name(s)';

  useEffect(() => {
    if (previousParticipantSelection.current !== participantSelection) {
      setValue('grantees', []);
      previousParticipantSelection.current = participantSelection;
    }
  }, [participantSelection, setValue]);

  const renderCheckbox = (name, value, label) => (
    <Checkbox
      id={value}
      label={label}
      value={value}
      name={name}
      className="smart-hub--report-checkbox"
      inputRef={register({
        validate: () => (
          getValues(name).length ? true : `${name} is required`
        ),
      })}
    />
  );

  return (
    <>
      <Helmet>
        <title>Activity summary</title>
      </Helmet>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Who was the activity for?">
        <div id="activity-for" />
        <div className="smart-hub--form-section">
          <Radio
            id="category-grantee"
            name="participantCategory"
            label="Grantee"
            value="grantee"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: true })}
          />
          <Radio
            id="category-non-grantee"
            name="participantCategory"
            label="Non-Grantee"
            value="non-grantee"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: true })}
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="grantees"
            label={participantLabel}
            disabled={disableParticipant}
            control={control}
            options={
              participants.map((participant) => ({ value: participant, label: participant }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="otherUsers"
            label="Collaborating Specialists"
            control={control}
            required={false}
            options={
              otherUsers.map((user) => ({ value: user, label: user }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="programTypes"
            label="Program type(s)"
            control={control}
            required
            options={
              programTypes.map((user) => ({ value: user, label: user }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="targetPopulations"
            label="Target Populations addressed. You may choose more than one."
            control={control}
            required
            options={
              targetPopulations.map((user) => ({ value: user, label: user }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="cdi">If a grantee is under CDI and that grant does not appear above: Enter the grantee name and CDI grant number (if known).</Label>
          <TextInput
            id="cdi"
            name="cdi"
            type="text"
            inputRef={register()}
          />
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Reason for Activity">
        <div id="reasons" />
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>
              Who requested this activity?
              Use &quot;Regional Office&quot; for TTA not requested by grantee
            </legend>
            <Radio
              id="grantee-request"
              name="requester"
              label="Grantee"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
            <Radio
              id="regional-office-request"
              name="requester"
              label="Regional Office"
              value="regional-office"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="reason"
            label="What was the reason for this activity?"
            control={control}
            options={
              reasons.map((reason) => ({ value: reason, label: reason }))
            }
          />
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Date and Duration">
        <div id="date" />
        <div className="smart-hub--form-section">
          <Grid row gap>
            <Grid col={6}>
              <DatePicker
                control={control}
                maxDate={endDate}
                name="startDate"
                label="Start Date"
                register={register}
                openUp
              />
            </Grid>
            <Grid col={6}>
              <DatePicker
                control={control}
                minDate={startDate}
                disabled={!startDate}
                name="endDate"
                label="End Date"
                register={register}
                openUp
              />
            </Grid>
            <Grid col={5}>
              <Label htmlFor="duration">Duration (round to the nearest half hour)</Label>
              <TextInput id="duration" name="duration" type="number" inputRef={register({ required: true })} />
            </Grid>
          </Grid>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Training or Technical Assistance">
        <div id="tta" />
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>What TTA was provided?</legend>
            {renderCheckbox('activityType', 'training', 'Training')}
            {renderCheckbox('activityType', 'technical-assistance', 'Technical Assistance')}
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>How was this activity conducted? (select at least one)</legend>
            <div className="smart-hub--form-section">
              <Radio
                id="activity-virtual"
                name="activityMethod"
                label="Virtual"
                value="virtual"
                className="smart-hub--report-checkbox"
                inputRef={register({ required: true })}
              />
              <Radio
                id="activity-in-person"
                name="activityMethod"
                label="In Person"
                value="in-person"
                className="smart-hub--report-checkbox"
                inputRef={register({ required: true })}
              />
            </div>
          </Fieldset>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Other participants">
        <div id="other-participants" />
        <div className="smart-hub--form-section">
          <MultiSelect
            name="participants"
            label="Grantee participant(s) involved"
            control={control}
            options={
              participants.map((participant) => ({ value: participant, label: participant }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="number-of-participants">Number of grantee participants involved</Label>
          <TextInput
            id="number-of-participants"
            name="numberOfParticipants"
            type="number"
            inputRef={register({ required: true })}
          />
        </div>
      </Fieldset>
    </>
  );
};

ActivitySummary.propTypes = {
  register: PropTypes.func.isRequired,
  watch: PropTypes.func.isRequired,
  setValue: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
};

const sections = [
  {
    title: 'Who was the activity for?',
    anchor: 'activity-for',
    items: [
      { label: 'Grantee or Non-grantee', name: 'participantCategory' },
      { label: 'Grantee name(s)', name: 'grantees' },
      { label: 'Grantee number(s)', name: '' },
      { label: 'Collaborating specialist(s)', name: 'otherUsers' },
      { label: 'CDI', name: 'cdi' },
      { label: 'Program type(s)', name: 'programTypes' },
      { label: 'Target Populations addressed', name: 'targetPopulations' },
    ],
  },
  {
    title: 'Reason for activity',
    anchor: 'reasons',
    items: [

      { label: 'Requested by', name: 'requester' },
      { label: 'reason(s)', name: 'reason' },
    ],
  },
  {
    title: 'Activity date',
    anchor: 'date',
    items: [
      { label: 'Start date', name: 'startDate' },
      { label: 'End date', name: 'endDate' },
      { label: 'Duration', name: 'duration' },
    ],
  },
  {
    title: 'Training or Technical Assistance',
    anchor: 'tta',
    items: [
      { label: 'TTA Provided', name: 'activityType' },
      { label: 'Conducted', name: 'activityMethod' },
    ],
  },
  {
    title: 'Other participants',
    anchor: 'other-participants',
    items: [
      { label: 'Grantee participants', name: 'participants' },
      { label: 'Number of participants', name: 'numberOfParticipants' },
    ],
  },
];

export default {
  position: 1,
  label: 'Activity summary',
  path: 'activity-summary',
  sections,
  render: (hookForm) => {
    const {
      register, watch, setValue, getValues, control,
    } = hookForm;
    return (
      <ActivitySummary
        register={register}
        watch={watch}
        setValue={setValue}
        getValues={getValues}
        control={control}
      />
    );
  },
};
