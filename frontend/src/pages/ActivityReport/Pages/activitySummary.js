import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isEmpty } from 'lodash';
import {
  Fieldset, Radio, Grid, TextInput, Checkbox,
} from '@trussworks/react-uswds';
import ReviewPage from './Review/ReviewPage';
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
import { NOT_STARTED } from '../../../components/Navigator/constants';

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
  const pageState = watch('pageState');
  const isVirtual = watch('deliveryMethod') === 'virtual';
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

  const disableRecipients = isEmpty(activityRecipientType);
  const nonGranteeSelected = activityRecipientType === 'non-grantee';
  const granteeSelected = activityRecipientType === 'grantee';
  const selectedRecipients = nonGranteeSelected ? nonGrantees : grants;
  const previousActivityRecipientType = useRef(activityRecipientType);
  const recipientLabel = nonGranteeSelected ? 'Other entities' : 'Recipient name(s)';
  const participantsLabel = nonGranteeSelected ? 'Other entity participants' : 'Recipient participants';
  const participants = nonGranteeSelected ? nonGranteeParticipants : granteeParticipants;

  useEffect(() => {
    if (previousActivityRecipientType.current !== activityRecipientType
      && previousActivityRecipientType.current !== ''
      && previousActivityRecipientType.current !== null) {
      setValue('activityRecipients', [], { shouldValidate: true });
      setValue('participants', [], { shouldValidate: true });
      setValue('programTypes', [], { shouldValidate: true });
      // Goals and objectives (page 3) has required fields when the recipient
      // type is grantee, so we need to make sure that page is set as "not started"
      // when recipient type is changed and we need to clear out any previously
      // selected goals and objectives
      setValue('goals', []);
      setValue('objectivesWithoutGoals', []);
      setValue('pageState', { ...pageState, 3: NOT_STARTED });
    }
    previousActivityRecipientType.current = activityRecipientType;
  }, [activityRecipientType, setValue, pageState]);

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

  const setEndDate = (newEnd) => {
    setValue('endDate', newEnd);
  };

  return (
    <>
      <Helmet>
        <title>Activity summary</title>
      </Helmet>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Who was the activity for?">
        <div id="activity-for" />
        <div className="margin-top-2">
          <FormItem
            label="Was this activity for a recipient or other entity?"
            name="activityRecipientType"
            fieldSetWrapper
          >
            <Radio
              id="category-grantee"
              name="activityRecipientType"
              label="Recipient"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify recipient or other entities' })}
            />
            <Radio
              id="category-non-grantee"
              name="activityRecipientType"
              label="Other entities"
              value="non-grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify recipient or other entities' })}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
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
              required="Please select at least one recipient or other entities"
              options={selectedRecipients}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
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
        <div className="margin-top-2">
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
        <div className="margin-top-2">
          <FormItem
            label="Target Populations addressed. You may choose more than one."
            name="targetPopulations"
            required
          >
            <MultiSelect
              name="targetPopulations"
              control={control}
              required="Please select at least one target population"
              options={targetPopulations.map((tp) => ({ value: tp, label: tp, isDisabled: tp === '--------------------' }))}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Reason for Activity">
        <div id="reasons" />
        <div className="margin-top-2">
          <FormItem
            label="Who requested this activity? Use &quot;Regional Office&quot; for TTA not requested by recipient."
            name="requester"
            fieldSetWrapper
          >
            <Radio
              id="granteeRequest"
              name="requester"
              label="Recipient"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify recipient or regional office' })}
            />
            <Radio
              id="requestorRegionalOffice"
              name="requester"
              label="Regional Office"
              value="regionalOffice"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Please specify recipient or regional office' })}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
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
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Activity date">
        <div id="date" />
        <div>
          <Grid row gap>
            <Grid col={6}>
              <FormItem
                label="Start Date"
                name="startDate"
              >
                <DatePicker
                  ariaName="Start Date (Required)"
                  control={control}
                  name="startDate"
                  isStartDate
                  maxDate={endDate}
                  setEndDate={setEndDate}
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
                  ariaName="End Date (required)"
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
                label="Duration in hours (round to the nearest half hour)"
                name="duration"
              >
                <TextInput
                  id="duration"
                  name="duration"
                  type="number"
                  min={0}
                  step={0.5}
                  inputRef={
                    register({
                      required: 'Please enter the duration of the activity',
                      valueAsNumber: true,
                      pattern: { value: /^\d+(\.[0,5]{1})?$/, message: 'Duration must be rounded to the nearest half hour' },
                      min: { value: 0, message: 'Duration can not be negative' },
                    })
                  }
                />
              </FormItem>
            </Grid>
          </Grid>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Training or Technical Assistance">
        <div id="tta" />
        <div className="margin-top-2">
          <FormItem
            label="What TTA was provided"
            name="ttaType"
            fieldSetWrapper
          >
            {renderCheckbox('ttaType', 'training', 'Training', 'Please specify the type of TTA provided')}
            {renderCheckbox('ttaType', 'technical-assistance', 'Technical Assistance', 'Please specify the type of TTA provided')}
          </FormItem>
        </div>
        <div className="margin-top-2">
          <FormItem
            label="How was the activity conducted?"
            name="deliveryMethod"
            fieldSetWrapper
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
          <div aria-live="polite">
            {isVirtual && (
            <div className="margin-top-2 smart-hub--virtual-delivery-group">
              <FormItem
                label="Please specify how the virtual event was conducted."
                name="virtualDeliveryType"
                fieldSetWrapper
              >
                <Radio
                  id="virtual-deliver-method-video"
                  name="virtualDeliveryType"
                  label="Video"
                  value="video"
                  className="smart-hub--report-checkbox"
                  inputRef={register({ required: 'Please specify how the virtual event was conducted' })}
                />
                <Radio
                  id="virtual-deliver-method-telephone"
                  name="virtualDeliveryType"
                  label="Telephone"
                  value="telephone"
                  className="smart-hub--report-checkbox"
                  inputRef={register({ required: 'Please specify how the virtual event was conducted' })}
                />
              </FormItem>
            </div>
            )}
          </div>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Participants">
        <div id="other-participants" />
        <div className="margin-top-2">
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
      { label: 'Recipient or other entities', name: 'activityRecipientType', sort: true },
      { label: 'Activity Participants', name: 'activityRecipients', path: 'name' },
      {
        label: 'Collaborating specialist(s)', name: 'collaborators', path: 'name', sort: true,
      },
      { label: 'Program type(s)', name: 'programTypes' },
      { label: 'Target Populations addressed', name: 'targetPopulations', sort: true },
    ],
  },
  {
    title: 'Reason for activity',
    anchor: 'reasons',
    items: [
      { label: 'Requested by', name: 'requester' },
      { label: 'reason(s)', name: 'reason', sort: true },
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
      { label: 'Recipient participants', name: 'participants', sort: true },
      { label: 'Number of participants', name: 'numberOfParticipants' },
    ],
  },
];

const ReviewSection = () => (
  <ReviewPage sections={sections} path="activity-summary" />
);

export default {
  position: 1,
  label: 'Activity summary',
  path: 'activity-summary',
  reviewSection: () => <ReviewSection />,
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
