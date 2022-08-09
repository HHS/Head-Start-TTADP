import React, {
  useState, useEffect, useRef, useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import { isEmpty, isUndefined } from 'lodash';
import {
  Fieldset, Radio, Grid, TextInput, Checkbox, Label,
} from '@trussworks/react-uswds';
import moment from 'moment';
import ReviewPage from './Review/ReviewPage';
import MultiSelect from '../../../components/MultiSelect';
import {
  otherEntityParticipants,
  recipientParticipants,
} from '../constants';
import FormItem from '../../../components/FormItem';
import { NOT_STARTED } from '../../../components/Navigator/constants';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import {
  REASONS as reasons,
  TARGET_POPULATIONS as targetPopulations,
} from '../../../Constants';
import ConnectionError from './components/ConnectionError';
import NetworkContext from '../../../NetworkContext';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import HtmlReviewItem from './Review/HtmlReviewItem';
import Section from './Review/ReviewSection';
import { reportIsEditable } from '../../../utils';

const ActivitySummary = ({
  recipients,
  collaborators,
}) => {
  // we store this to cause the end date to re-render when updated by the start date (and only then)
  const [endDateKey, setEndDateKey] = useState('endDate');

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
  const { otherEntities: rawOtherEntities, grants: rawGrants } = recipients;

  const { connectionActive } = useContext(NetworkContext);

  const grants = rawGrants.map((recipient) => ({
    label: recipient.name,
    options: recipient.grants.map((grant) => ({
      value: grant.activityRecipientId,
      label: grant.name,
    })),
  }));

  const otherEntities = rawOtherEntities.map((entity) => ({
    label: entity.name,
    value: entity.activityRecipientId,
  }));

  const disableRecipients = isEmpty(activityRecipientType);
  const otherEntitySelected = activityRecipientType === 'other-entity';
  const selectedRecipients = otherEntitySelected ? otherEntities : grants;
  const previousActivityRecipientType = useRef(activityRecipientType);
  const recipientLabel = otherEntitySelected ? 'Other entities' : 'Recipient names';
  const participantsLabel = otherEntitySelected ? 'Other entity participants' : 'Recipient participants';
  const participants = otherEntitySelected ? otherEntityParticipants : recipientParticipants;
  const placeholderText = '- Select -';

  useEffect(() => {
    if (previousActivityRecipientType.current !== activityRecipientType
      && previousActivityRecipientType.current !== ''
      && previousActivityRecipientType.current !== null) {
      setValue('activityRecipients', [], { shouldValidate: true });
      setValue('participants', [], { shouldValidate: true });
      // Goals and objectives (page 3) has required fields when the recipient
      // type is recipient, so we need to make sure that page is set as "not started"
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

    // this will trigger the re-render of the
    // uncontrolled end date input
    // it's a little clumsy, but it does work
    setEndDateKey(`endDate-${newEnd}`);
  };

  return (
    <>
      <Helmet>
        <title>Activity summary</title>
      </Helmet>
      <p className="usa-prose">
        <span className="smart-hub--form-required font-family-sans font-ui-xs">* </span>
        indicates required field
      </p>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Who was the activity for?">
        <div id="activity-for" />
        <div className="margin-top-2">
          <FormItem
            label="Was this activity for a recipient or other entity?"
            name="activityRecipientType"
            fieldSetWrapper
          >
            <Radio
              id="category-recipient"
              name="activityRecipientType"
              label="Recipient"
              value="recipient"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
              required
            />
            <Radio
              id="category-other-entity"
              name="activityRecipientType"
              label="Other entity"
              value="other-entity"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          {!disableRecipients
          && !connectionActive
          && !selectedRecipients.length
            ? <ConnectionError />
            : null}
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
              required="Select at least one"
              options={selectedRecipients}
              placeholderText={placeholderText}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          {!connectionActive && !collaborators.length ? <ConnectionError /> : null }
          <FormItem
            label="Collaborating specialists"
            name="activityReportCollaborators"
            required={false}
          >
            <MultiSelect
              name="activityReportCollaborators"
              control={control}
              required={false}
              valueProperty="user.id"
              labelProperty="user.fullName"
              simple={false}
              placeholderText={placeholderText}
              options={collaborators.map((user) => ({
                // we want the role construction here to match what later is returned from the
                // database, so we do this weirdo mapping thing here
                value: user.id, label: user.name, role: user.role.map((r) => ({ role: r })),
              }))}
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
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Reason for activity">
        <div id="reasons" />
        <div className="margin-top-2">
          <FormItem
            label="Who requested this activity? Use &quot;Regional Office&quot; for TTA not requested by recipient."
            name="requester"
            fieldSetWrapper
          >
            <Radio
              id="recipientRequest"
              name="requester"
              label="Recipient"
              value="recipient"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />
            <Radio
              id="requestorRegionalOffice"
              name="requester"
              label="Regional Office"
              value="regionalOffice"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          <FormItem
            label="Reasons"
            name="reason"
          >
            <MultiSelect
              name="reason"
              control={control}
              options={reasons.map((reason) => ({ value: reason, label: reason }))}
              required="Select at least one"
              placeholderText={placeholderText}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Activity date">
        <div id="date" />
        <div>
          <Grid row>
            <Grid col={8}>
              <FormItem
                label="Start date"
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
                  maxDate={endDate}
                  isStartDate
                />
              </FormItem>
            </Grid>
          </Grid>
          <Grid row>
            <Grid col={8}>
              <FormItem
                label="End date"
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
                  value={endDate}
                  minDate={startDate}
                  key={endDateKey}
                />
              </FormItem>
            </Grid>
          </Grid>
          <Grid row>
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
                      required: 'Enter duration',
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
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Context">
        <Label htmlFor="context">Provide background or context for this activity</Label>
        <div className="smart-hub--text-area__resize-vertical margin-top-1">
          <HookFormRichEditor ariaLabel="Context" name="context" id="context" />
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
            {renderCheckbox('ttaType', 'training', 'Training', 'Select at least one')}
            {renderCheckbox('ttaType', 'technical-assistance', 'Technical Assistance', 'Select at least one')}
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
              inputRef={register({ required: 'Select one' })}
            />
            <Radio
              id="delivery-method-in-person"
              name="deliveryMethod"
              label="In Person"
              value="in-person"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
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
              placeholderText={placeholderText}
              options={
              participants.map((participant) => ({ value: participant, label: participant }))
            }
              required="Select at least one"
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
                      required: 'Enter number of participants',
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
    otherEntities: PropTypes.arrayOf(
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
      { label: 'Recipient or other entity', name: 'activityRecipientType', sort: true },
      { label: 'Activity Participants', name: 'activityRecipients', path: 'name' },
      {
        label: 'Collaborating specialist(s)', name: 'activityReportCollaborators', path: 'user.fullName', sort: true,
      },
      { label: 'Target Populations addressed', name: 'targetPopulations', sort: true },
    ],
  },
  {
    title: 'Reason for activity',
    anchor: 'reasons',
    items: [
      { label: 'Requested by', name: 'requester' },
      { label: 'Reasons', name: 'reason', sort: true },
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

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    context,
    calculatedStatus,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);
  return (
    <>
      <ReviewPage sections={sections} path="activity-summary" />
      <Section
        hidePrint={isUndefined(context)}
        key="context"
        basePath="activity-summary"
        anchor="context"
        title="Context"
        canEdit={canEdit}
      >
        <HtmlReviewItem
          label="Context"
          name="context"
        />
      </Section>
    </>
  );
};

export const isPageComplete = (formData, formState) => {
  const { isValid } = formState;
  if (isValid) {
    return true;
  }

  const {
    // strings
    activityRecipientType,
    requester,
    deliveryMethod,
    virtualDeliveryType,

    // arrays
    activityRecipients,
    targetPopulations: targetPopulationsArray,
    reason,
    ttaType,
    participants,

    // numbers
    duration,
    numberOfParticipants,

    // dates
    startDate,
    endDate,
  } = formData;

  const stringsToValidate = [
    activityRecipientType,
    requester,
    deliveryMethod,
  ];

  if (!stringsToValidate.every((str) => str)) {
    return false;
  }

  const arraysToValidate = [
    activityRecipients,
    targetPopulationsArray,
    reason,
    ttaType,
    participants,
  ];

  if (!arraysToValidate.every((arr) => arr.length)) {
    return false;
  }

  const numbersToValidate = [
    duration,
    numberOfParticipants,
  ];

  if (!numbersToValidate.every((num) => num && Number.isNaN(num) === false)) {
    return false;
  }

  if (![startDate, endDate].every((date) => moment(date, 'MM/DD/YYYY').isValid())) {
    return false;
  }

  if (deliveryMethod === 'virtual' && !virtualDeliveryType) {
    return false;
  }

  return true;
};

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
  isPageComplete,
};
