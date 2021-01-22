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
  collaborators,
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
            name="collaborators"
            label="Collaborating Specialists"
            control={control}
            required={false}
            valueProperty="id"
            labelProperty="name"
            simple={false}
            options={collaborators.map((user) => ({ value: user.id, label: user.name }))}
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="programTypes"
            label="Program type(s)"
            control={control}
            required
            options={programTypes.map((pt) => ({ value: pt, label: pt }))}
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="targetPopulations"
            label="Target Populations addressed. You may choose more than one."
            control={control}
            required
            options={targetPopulations.map((tp) => ({ value: tp, label: tp }))}
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
              id="granteeRequest"
              name="requester"
              label="Grantee"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
            <Radio
              id="requestorRegionalOffice"
              name="requester"
              label="Regional Office"
              value="regionalOffice"
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
            options={reasons.map((reason) => ({ value: reason, label: reason }))}
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
              <TextInput id="duration" name="duration" type="number" inputRef={register({ required: true, valueAsNumber: true })} />
            </Grid>
          </Grid>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Training or Technical Assistance">
        <div id="tta" />
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>What TTA was provided?</legend>
            {renderCheckbox('ttaType', 'training', 'Training')}
            {renderCheckbox('ttaType', 'technical-assistance', 'Technical Assistance')}
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>How was this activity conducted? (select at least one)</legend>
            <div className="smart-hub--form-section">
              <Radio
                id="delivery-method-virtual"
                name="deliveryMethod"
                label="Virtual"
                value="virtual"
                className="smart-hub--report-checkbox"
                inputRef={register({ required: true })}
              />
              <Radio
                id="delivery-method-in-person"
                name="deliveryMethod"
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
          <Label htmlFor="numberOfParticipants">Number of grantee participants involved</Label>
          <TextInput
            id="numberOfParticipants"
            name="numberOfParticipants"
            type="number"
            inputRef={register({ required: true, valueAsNumber: true })}
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
  collaborators: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
    }),
  ).isRequired,
  recipients: PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        grants: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            activityRecipientId: PropTypes.number.isRequired,
          }),
        ),
      }),
    ),
    nonGrantees: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        activityRecipientId: PropTypes.number.isRequired,
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
      { label: 'Collaborating specialist(s)', name: 'collaborators', path: 'name' },
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
      { label: 'TTA Provided', name: 'ttaType' },
      { label: 'Conducted', name: 'deliveryMethod' },
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
  review: false,
  render: (hookForm, additionalData) => {
    const {
      register, watch, setValue, getValues, control,
    } = hookForm;
    const { recipients, collaborators } = additionalData;
    return (
      <ActivitySummary
        register={register}
        watch={watch}
        recipients={recipients}
        setValue={setValue}
        getValues={getValues}
        control={control}
        collaborators={collaborators}
      />
    );
  },
};
