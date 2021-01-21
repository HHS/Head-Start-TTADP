import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';

import {
  Fieldset, Radio, Label, Grid, TextInput, Checkbox,
} from '@trussworks/react-uswds';

import DatePicker from '../../../components/DatePicker';
import MultiSelect from '../../../components/MultiSelect';
import {
  nonGranteeParticipants,
  granteeParticipants,
  reasons,
  otherUsers,
  programTypes,
  targetPopulations,
} from '../constants';

const ActivitySummary = ({
  register,
  watch,
  setValue,
  control,
  getValues,
  recipients,
}) => {
  const activityRecipientType = watch('activityRecipientType');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const { nonGrantees: rawNonGrantees, grants: rawGrants } = recipients;

  const grants = rawGrants.map((grantee) => ({
    label: grantee.name,
    options: grantee.grants.map((grant) => ({
      value: grant.activityRecipientId,
      label: grant.name,
    })),
  }));

  const nonGrantees = rawNonGrantees.map((nonGrantee) => ({
    label: nonGrantee.name,
    value: nonGrantee.activityRecipientId,
  }));

  const disableRecipients = activityRecipientType === '';
  const nonGranteeSelected = activityRecipientType === 'non-grantee';
  const selectedRecipients = nonGranteeSelected ? nonGrantees : grants;
  const previousActivityRecipientType = useRef(activityRecipientType);
  const recipientLabel = nonGranteeSelected ? 'Non-grantee name(s)' : 'Grantee name(s)';
  const participantsLabel = nonGranteeSelected ? 'Non-grantee participants' : 'Grantee participants';
  const participants = nonGranteeSelected ? nonGranteeParticipants : granteeParticipants;

  useEffect(() => {
    if (previousActivityRecipientType.current !== activityRecipientType) {
      setValue('activityRecipients', []);
      setValue('participants', []);
      previousActivityRecipientType.current = activityRecipientType;
    }
  }, [activityRecipientType, setValue]);

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
            name="activityRecipientType"
            label="Grantee"
            value="grantee"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: true })}
          />
          <Radio
            id="category-non-grantee"
            name="activityRecipientType"
            label="Non-Grantee"
            value="non-grantee"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: true })}
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="activityRecipients"
            label={recipientLabel}
            disabled={disableRecipients}
            control={control}
            valueProperty="activityRecipientId"
            labelProperty="name"
            simple={false}
            options={selectedRecipients}
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="other-users"
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
            name="program-types"
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
            name="target-populations"
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
                name="start-date"
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
                name="end-date"
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
            {renderCheckbox('activity-type', 'training', 'Training')}
            {renderCheckbox('activity-type', 'technical-assistance', 'Technical Assistance')}
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>How was this activity conducted? (select at least one)</legend>
            <div className="smart-hub--form-section">
              <Radio
                id="activity-virtual"
                name="activity-method"
                label="Virtual"
                value="virtual"
                className="smart-hub--report-checkbox"
                inputRef={register({ required: true })}
              />
              <Radio
                id="activity-in-person"
                name="activity-method"
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
            label={participantsLabel}
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
            name="number-of-participants"
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
  recipients: PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        grants: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            participantId: PropTypes.number.isRequired,
          }),
        ),
      }),
    ),
    nonGrantees: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        participantId: PropTypes.number.isRequired,
      }),
    ),
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
};

const sections = [
  {
    title: 'Who was the activity for?',
    anchor: 'activity-for',
    items: [
      { label: 'Grantee or Non-grantee', name: 'activityRecipientType' },
      { label: 'Activity Participants', name: 'activityRecipients', path: 'name' },
      { label: 'Collaborating specialist(s)', name: 'otherUsers', path: 'label' },
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
      { label: 'Start date', name: 'start-date' },
      { label: 'End date', name: 'end-date' },
      { label: 'Duration', name: 'duration' },
    ],
  },
  {
    title: 'Training or Technical Assistance',
    anchor: 'tta',
    items: [
      { label: 'TTA Provided', name: 'activity-type' },
      { label: 'Conducted', name: 'activity-method' },
    ],
  },
  {
    title: 'Other participants',
    anchor: 'other-participants',
    items: [
      { label: 'Grantee participants', name: 'participants' },
      { label: 'Number of participants', name: 'number-of-participants' },
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
    const { recipients } = additionalData;
    return (
      <ActivitySummary
        register={register}
        watch={watch}
        recipients={recipients}
        setValue={setValue}
        getValues={getValues}
        control={control}
      />
    );
  },
};
