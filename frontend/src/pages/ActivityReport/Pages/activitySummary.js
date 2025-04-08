import React, {
  useState, useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, useController, Controller } from 'react-hook-form';
import { isUndefined } from 'lodash';
import {
  Fieldset,
  Radio,
  Grid,
  TextInput,
  Checkbox,
  Label,
} from '@trussworks/react-uswds';
import moment from 'moment';
import {
  TARGET_POPULATIONS as targetPopulations,
  LANGUAGES,
  ACTIVITY_REASONS,
} from '@ttahub/common';
import Select from 'react-select';
import ReviewPage from './Review/ReviewPage';
import MultiSelect from '../../../components/MultiSelect';
import {
  recipientParticipants,
} from '../constants';
import FormItem from '../../../components/FormItem';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import ConnectionError from '../../../components/ConnectionError';
import NetworkContext from '../../../NetworkContext';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import HtmlReviewItem from './Review/HtmlReviewItem';
import Section from './Review/ReviewSection';
import { reportIsEditable } from '../../../utils';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import './activitySummary.scss';
import SingleRecipientSelect from './components/SingleRecipientSelect';
import selectOptionsReset from '../../../components/selectOptionsReset';
import ParticipantsNumberOfParticipants from '../../../components/ParticipantsNumberOfParticipants';

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
    // clearErrors,
  } = useFormContext();

  const {
    field: {
      onChange: onChangeActivityRecipients,
      onBlur: onBlurActivityRecipients,
      value: activityRecipients,
      // name: activityRecipientsInputName,
    },
  } = useController({
    name: 'activityRecipients',
    defaultValue: false,
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || 'Please select a recipient and grant',
      },
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const deliveryMethod = watch('deliveryMethod');

  const [previousStartDate, setPreviousStartDate] = useState(startDate);

  const selectedGoals = watch('goals');
  const goalForEditing = watch('goalForEditing');

  const { grants: rawGrants } = recipients;

  const { connectionActive } = useContext(NetworkContext);

  const grants = rawGrants.map((recipient) => ({
    id: recipient.id,
    label: recipient.name,
    options: recipient.grants.map((grant) => ({
      value: grant.activityRecipientId,
      label: grant.name,
      recipientIdForLookUp: recipient.id,
    })),
  }));
  const selectedRecipients = grants;
  const placeholderText = '- Select -';

  const setEndDate = (newEnd) => {
    setValue('endDate', newEnd);

    // this will trigger the re-render of the
    // uncontrolled end date input
    // it's a little clumsy, but it does work
    setEndDateKey(`endDate-${newEnd}`);
  };

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

  const validateCitations = () => {
    const allGoals = [selectedGoals, goalForEditing].flat().filter((g) => g !== null);
    // If we have a monitoring goal.
    const selectedMonitoringGoal = allGoals.filter((gf) => gf && gf.standard).find((goal) => goal.standard === 'Monitoring');
    if (selectedMonitoringGoal) {
      // Get all the citations in a single array from all the goal objectives.
      const allCitations = (selectedMonitoringGoal.objectives || [])
        .map((objective) => objective.citations)
        .flat()
        .filter((citation) => citation !== null);
      // If we have selected citations
      if (allCitations.length) {
        const start = moment(startDate, 'MM/DD/YYYY');
        const invalidCitations = allCitations.filter(
          (citation) => citation.monitoringReferences.some(
            (monitoringReference) => moment(monitoringReference.reportDeliveryDate, 'YYYY-MM-DD').isAfter(start),
          ),
        );
        // If any of the citations are invalid given the new date.
        if (invalidCitations.length) {
          // Rollback the start date.
          setValue('startDate', previousStartDate);
          // Display monitoring citation warning and keep start date.
          return 'The date entered is not valid with the selected citations.';
        }
      }
    }
    // Save the last good start date.
    setPreviousStartDate(startDate);
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Activity Summary</title>
      </Helmet>
      <IndicatesRequiredField />
      <Fieldset className="smart-hub-activity-summary smart-hub--report-legend margin-top-4" legend="Who was the activity for?">
        <div className="margin-top-2 margin-bottom-0">
          {!connectionActive
         && !selectedRecipients.length
            ? <ConnectionError />
            : null}
          <SingleRecipientSelect
            selectedRecipients={activityRecipients}
            possibleRecipients={selectedRecipients || []}
            onChangeActivityRecipients={onChangeActivityRecipients}
            onBlurActivityRecipients={onBlurActivityRecipients}
          />
        </div>
        <div id="other-participants" />
        <div className="margin-top-2">
          <FormItem
            label="Recipient participants"
            name="participants"
          >
            <MultiSelect
              name="participants"
              control={control}
              placeholderText={placeholderText}
              options={
            recipientParticipants.map((participant) => ({ value: participant, label: participant }))
            }
              required="Select at least one"
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          {!connectionActive && !collaborators.length ? <ConnectionError /> : null }
          <FormItem
            label="Collaborating specialists "
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
                value: user.id, label: user.name, roles: user.roles.map((r) => r.fullName),
              }))}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          <FormItem
            label="Why was this activity requested? "
            name="activityReason"
            required
          >
            <Controller
              render={({ onChange: controllerOnChange, value, onBlur }) => (
                <Select
                  value={value ? { value, label: value } : null}
                  inputId="activityReason"
                  name="activityReason"
                  className="usa-select"
                  placeholder="- Select -"
                  styles={selectOptionsReset}
                  components={{
                    DropdownIndicator: null,
                  }}
                  onChange={(selected) => {
                    controllerOnChange(selected ? selected.value : null);
                  }}
                  inputRef={register({ required: 'Select at least one reason for activity' })}
                  options={ACTIVITY_REASONS.map((reason) => ({
                    value: reason, label: reason,
                  }))}
                  onBlur={onBlur}
                  required
                  isMulti={false}
                />
              )}
              control={control}
              rules={{
                validate: (value) => {
                  if (!value || value.length === 0) {
                    return 'Select a reason for activity';
                  }
                  return true;
                },
              }}
              name="activityReason"
              defaultValue={null}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          <FormItem
            label="Target populations addressed "
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
                  isStartDate
                  inputId="startDate"
                  endDate={endDate}
                  additionalValidation={validateCitations}
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
                  inputId="endDate"
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
                required
              >
                <TextInput
                  id="duration"
                  name="duration"
                  type="number"
                  min={0}
                  max={99.5}
                  step={0.5}
                  required
                  inputRef={
                    register({
                      required: 'Enter duration',
                      valueAsNumber: true,
                      pattern: { value: /^\d+(\.[0,5]{1})?$/, message: 'Duration must be rounded to the nearest half hour' },
                      min: { value: 0.5, message: 'Duration must be greater than 0 hours' },
                      max: { value: 99, message: 'Duration must be less than or equal to 99 hours' },
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
            label="What type of TTA was provided?"
            name="ttaType"
            fieldSetWrapper
          >
            {renderCheckbox('ttaType', 'training', 'Training', 'Select at least one')}
            {renderCheckbox('ttaType', 'technical-assistance', 'Technical Assistance', 'Select at least one')}
          </FormItem>
        </div>
        <div className="margin-top-2">
          <FormItem
            label="Language used"
            name="language"
            required
          >
            <MultiSelect
              name="language"
              control={control}
              options={LANGUAGES.map((language) => ({ value: language, label: language }))}
              required="Select at least one"
              placeholderText={placeholderText}
            />
          </FormItem>
        </div>
        <div className="margin-top-2">
          <FormItem
            label="What was the delivery method for this activity?"
            name="deliveryMethod"
            fieldSetWrapper
          >
            <Radio
              id="delivery-method-in-person"
              name="deliveryMethod"
              label="In Person"
              value="in-person"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />

            <Radio
              id="delivery-method-virtual"
              name="deliveryMethod"
              label="Virtual"
              value="virtual"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />

            <Radio
              id="delivery-method-hybrid"
              name="deliveryMethod"
              label="Hybrid"
              value="hybrid"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: 'Select one' })}
            />
          </FormItem>
        </div>
        <div>
          <ParticipantsNumberOfParticipants
            isHybrid={deliveryMethod === 'hybrid'}
            register={register}
            isDeliveryMethodSelected={['virtual', 'hybrid', 'in-person'].includes(deliveryMethod)}
          />
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

const getNumberOfParticipants = (deliveryMethod) => {
  const numberOfParticipants = [
    { label: 'Number of participants attending in person', name: 'numberOfParticipants' },
  ];
  if (deliveryMethod === 'hybrid') {
    numberOfParticipants.push(
      { label: 'Number of participants attending virtually', name: 'numberOfParticipantsVirtually' },
    );
  }
  return numberOfParticipants;
};

const getSections = (formData) => {
  const { deliveryMethod } = formData;
  return [
    {
      title: 'Who was the activity for?',
      anchor: 'activity-for',
      items: [
        { label: 'Recipient', name: 'activityRecipients', path: 'name' },
        { label: 'Recipient participants', name: 'participants', sort: true },
        {
          label: 'Collaborating specialists', name: 'activityReportCollaborators', path: 'user.fullName', sort: true,
        },
        {
          label: 'Why activity requested', name: 'activityReason',
        },
        { label: 'Target populations', name: 'targetPopulations', sort: true },
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
      title: 'Training or technical assistance',
      anchor: 'tta',
      items: [
        { label: 'TTA type', name: 'ttaType' },
        { label: 'Language used', name: 'language' },
        { label: 'Delivery method', name: 'deliveryMethod' },
        ...getNumberOfParticipants(deliveryMethod),

      ],
    },
  ];
};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    context,
    calculatedStatus,
    deliveryMethod,
  } = watch();

  const canEdit = reportIsEditable(calculatedStatus);
  return (
    <>
      <ReviewPage sections={getSections({ deliveryMethod })} path="activity-summary" />
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
    deliveryMethod,
    activityReason,

    // arrays
    activityRecipients,
    targetPopulations: targetPopulationsArray,
    ttaType,
    participants,
    language,

    // numbers
    duration,
    numberOfParticipants,

    // dates
    startDate,
    endDate,
  } = formData;

  const stringsToValidate = [
    activityRecipientType,
    deliveryMethod,
    activityReason,
  ];

  if (!stringsToValidate.every((str) => str)) {
    return false;
  }

  // If language is null return false for now.
  if (!language) {
    return false;
  }

  const arraysToValidate = [
    activityRecipients,
    targetPopulationsArray,
    ttaType,
    participants,
    language,
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
  return true;
};

export default {
  position: 1,
  label: 'Activity summary',
  path: 'activity-summary',
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
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => {
    const { recipients, collaborators, groups } = additionalData;
    return (
      <>
        <ActivitySummary
          recipients={recipients}
          collaborators={collaborators}
          groups={groups}
        />
        <Alert />
        <NavigatorButtons
          isAppLoading={isAppLoading}
          onContinue={onContinue}
          onSaveDraft={onSaveDraft}
          path="activity-summary"
          position={1}
          onUpdatePage={onUpdatePage}
        />
      </>
    );
  },
  isPageComplete,
};
