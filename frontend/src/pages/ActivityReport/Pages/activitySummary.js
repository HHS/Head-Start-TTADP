import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';

import {
  Fieldset, Radio, Grid, TextInput, Checkbox,
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
import FormItem from '../../../components/FormItem';

const ActivitySummary = ({
  recipients,
  collaborators,
}) => {
  const {
    register,
    watch,
    setValue,
    control,
    getValues,
  } = useFormContext();
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
  const granteeSelected = activityRecipientType === 'grantee';
  const selectedRecipients = nonGranteeSelected ? nonGrantees : grants;
  const previousActivityRecipientType = useRef(activityRecipientType);
  const recipientLabel = nonGranteeSelected ? 'Non-grantee name(s)' : 'Grantee name(s)';
  const participantsLabel = nonGranteeSelected ? 'Non-grantee participants' : 'Grantee participants';
  const participants = nonGranteeSelected ? nonGranteeParticipants : granteeParticipants;

  useEffect(() => {
    if (previousActivityRecipientType.current !== activityRecipientType) {
      setValue('activityRecipients', []);
      setValue('participants', []);
      setValue('programTypes', []);
      previousActivityRecipientType.current = activityRecipientType;
    }
  }, [activityRecipientType, setValue]);

  const renderCheckbox = (name, value, label, requiredMessage) => (
    <Checkbox
      id={value}
      label={label}
      value={value}
      name={name}
      className="smart-hub--report-checkbox"
      inputRef={register({
        validate: () => (
          getValues(name).length ? true : requiredMessage
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
          <FormItem
            label="Was this activity for a grantee or non-grantee?"
            name="activityRecipientType"
            isCheckbox
          >
            <Radio
              id="category-grantee"
              name="activityRecipientType"
              label="Grantee"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify grantee or non-grantee' })}
            />
            <Radio
              id="category-non-grantee"
              name="activityRecipientType"
              label="Non-Grantee"
              value="non-grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify grantee or non-grantee' })}
            />
          </FormItem>
        </div>
        <div className="smart-hub--form-section">
          <FormItem
            label={recipientLabel}
            name="activityRecipients"
          >
            <MultiSelect
              name="activityRecipients"
              disabled={disableRecipients}
              control={control}
              valueProperty="activityRecipientId"
              labelProperty="name"
              simple={false}
              required="Please select at least one grantee or non-grantee"
              options={selectedRecipients}
            />
          </FormItem>
        </div>
        <div className="smart-hub--form-section">
          <FormItem
            label="Collaborating Specialists"
            name="collaborators"
            required={false}
          >
            <MultiSelect
              name="collaborators"
              control={control}
              required={false}
              valueProperty="id"
              labelProperty="name"
              simple={false}
              options={collaborators.map((user) => ({ value: user.id, label: user.name }))}
            />
          </FormItem>
        </div>
        {granteeSelected
        && (
        <div className="smart-hub--form-section">
          <FormItem
            label="Program type(s)"
            name="programTypes"
          >
            <MultiSelect
              name="programTypes"
              label="Program type(s)"
              control={control}
              required="Please select at least one program type"
              options={programTypes.map((pt) => ({ value: pt, label: pt }))}
            />
          </FormItem>
        </div>
        )}
        <div className="smart-hub--form-section">
          <FormItem
            label="Target Populations addressed. You may choose more than one."
            name="targetPopulations"
          >
            <MultiSelect
              name="targetPopulations"
              control={control}
              required="Please select at least one target population"
              options={targetPopulations.map((tp) => ({ value: tp, label: tp }))}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Reason for Activity">
        <div id="reasons" />
        <div className="smart-hub--form-section">
          <FormItem
            label="Who requested this activity? Use &quot;Regional Office&quot; for TTA not requested by grantee."
            name="requester"
            isCheckbox
          >
            <Radio
              id="granteeRequest"
              name="requester"
              label="Grantee"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify grantee or regional office' })}
            />
            <Radio
              id="requestorRegionalOffice"
              name="requester"
              label="Regional Office"
              value="regionalOffice"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify grantee or regional office' })}
            />
          </FormItem>
        </div>
        <div className="smart-hub--form-section">
          <FormItem
            label="Reason(s). You may choose more than one."
            name="reason"
          >
            <MultiSelect
              name="reason"
              control={control}
              options={reasons.map((reason) => ({ value: reason, label: reason }))}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Activity date">
        <div id="date" />
        <div>
          <Grid row gap>
            <Grid col={6}>
              <FormItem
                label="Start Date"
                name="startDate"
              >
                <DatePicker
                  control={control}
                  maxDate={endDate}
                  name="startDate"
                  openUp
                />
              </FormItem>
            </Grid>
            <Grid col={6}>
              <FormItem
                label="End Date"
                name="endDate"
              >
                <DatePicker
                  control={control}
                  minDate={startDate}
                  disabled={!startDate}
                  name="endDate"
                  openUp
                />
              </FormItem>
            </Grid>
            <Grid col={5}>
              <FormItem
                label="Duration"
                name="duration"
              >
                <TextInput
                  id="duration"
                  name="duration"
                  type="number"
                  min={0}
                  inputRef={
                    register({
                      required: 'Please enter the duration of the activity',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Duration can not be negative' },
                    })
                  }
                />
              </FormItem>
            </Grid>
          </Grid>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Training or Technical Assistance">
        <div id="tta" />
        <div className="smart-hub--form-section">
          <FormItem
            label="What TTA was provided"
            name="ttaType"
            isCheckbox
          >
            {renderCheckbox('ttaType', 'training', 'Training', 'Please specify the type of TTA provided')}
            {renderCheckbox('ttaType', 'technical-assistance', 'Technical Assistance', 'Please specify the type of TTA provided')}
          </FormItem>
        </div>
        <div className="smart-hub--form-section">
          <FormItem
            label="How was the activity conducted?"
            name="deliveryMethod"
            isCheckbox
          >
            <Radio
              id="delivery-method-virtual"
              name="deliveryMethod"
              label="Virtual"
              value="virtual"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify how the activity was conducted' })}
            />
            <Radio
              id="delivery-method-in-person"
              name="deliveryMethod"
              label="In Person"
              value="in-person"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify how the activity was conducted' })}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Participants">
        <div id="other-participants" />
        <div className="smart-hub--form-section">
          <FormItem
            label={participantsLabel}
            name="participants"
          >
            <MultiSelect
              name="participants"
              control={control}
              options={
              participants.map((participant) => ({ value: participant, label: participant }))
            }
            />
          </FormItem>
        </div>
        <div>
          <FormItem
            label="Number of participants involved"
            name="numberOfParticipants"
          >
            <Grid row gap>
              <Grid col={5}>
                <TextInput
                  id="numberOfParticipants"
                  name="numberOfParticipants"
                  type="number"
                  min={1}
                  inputRef={
                    register({
                      required: 'Please enter the number of participants involved in the activity',
                      valueAsNumber: true,
                      min: {
                        value: 1,
                        message: 'Number of participants can not be zero or negative',
                      },
                    })
                  }
                />
              </Grid>
            </Grid>
          </FormItem>
        </div>
      </Fieldset>
    </>
  );
};

ActivitySummary.propTypes = {
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
  render: (additionalData) => {
    const { recipients, collaborators } = additionalData;
    return (
      <ActivitySummary
        recipients={recipients}
        collaborators={collaborators}
      />
    );
  },
};
