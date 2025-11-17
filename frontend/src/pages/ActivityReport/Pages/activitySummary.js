import React, {
  useState, useContext, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, useController, Controller } from 'react-hook-form';
import {
  Fieldset,
  Radio,
  Grid,
  TextInput,
  Checkbox,
  Label,
  Alert as USWDSAlert,
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
  recipientParticipants, MODAL_CONFIG,
} from '../constants';
import FormItem from '../../../components/FormItem';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import ConnectionError from '../../../components/ConnectionError';
import NetworkContext from '../../../NetworkContext';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import './activitySummary.scss';
import SingleRecipientSelect from './components/SingleRecipientSelect';
import selectOptionsReset from '../../../components/selectOptionsReset';
import ParticipantsNumberOfParticipants from '../../../components/ParticipantsNumberOfParticipants';
import { fetchCitationsByGrant } from '../../../fetchers/citations';
import ModalWithCancel from '../../../components/ModalWithCancel';
import { getGoalTemplates } from '../../../fetchers/goalTemplates';
import Drawer from '../../../components/Drawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Req from '../../../components/Req';
import useHookFormEndDateWithKey from '../../../hooks/useHookFormEndDateWithKey';

export const citationsDiffer = (existingGoals = [], fetchedCitations = []) => {
  const fetchedCitationStrings = new Set(fetchedCitations.map((c) => c.citation?.trim()));

  return existingGoals.some((goal) => (goal.objectives || [])
    .some((obj) => (obj.citations || []).some((c) => {
      const citationText = c.citation?.trim();
      return !fetchedCitationStrings.has(citationText);
    })));
};

export const checkRecipientsAndGoals = (data, hasMonitoringGoals) => {
  const goalsAndObjectives = data.goalsAndObjectives || [];
  const recipients = data.activityRecipients || [];
  const goalTemplates = data.goalTemplates || [];
  const citationsByGrant = data.citationsByGrant || [];

  if (recipients.length === 0 && goalsAndObjectives.length > 0) {
    return 'EMPTY_RECIPIENTS_WITH_GOALS';
  }
  // Only show modal if none of the selected grants have Monitoring goals
  const hasAtLeastOneMonitoringGoal = goalTemplates.some((gt) => gt.standard === 'Monitoring');

  if (hasMonitoringGoals && !hasAtLeastOneMonitoringGoal) {
    return 'MISSING_MONITORING_GOAL';
  }
  if (hasMonitoringGoals && citationsDiffer(goalsAndObjectives, citationsByGrant)) {
    return 'DIFFERENT_CITATIONS';
  }

  return null; // no modal needed
};

const ActivitySummary = ({
  recipients,
  collaborators,
  setShouldAutoSave,
}) => {
  const { endDateKey, setEndDate } = useHookFormEndDateWithKey();

  const {
    register,
    watch,
    setValue,
    control,
    getValues,
    // clearErrors,
  } = useFormContext();

  const goalsAndObjectives = watch('goalsAndObjectives');

  const hasMonitoringGoals = (goalsAndObjectives || []).some(
    (g) => g.name?.trim().toLowerCase().startsWith('(monitoring)'),
  );

  const {
    field: {
      onChange: onChangeActivityRecipients,
      onBlur: onBlurActivityRecipients,
      value: activityRecipients,
      // name: activityRecipientsInputName,
    },
  } = useController({
    name: 'activityRecipients',
    defaultValue: [],
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || 'Please select a recipient and grant',
      },
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const deliveryMethod = watch('deliveryMethod');

  const modalRef = useRef();
  const activityReasonRef = useRef(null);
  const recipientSelectRef = useRef(null);
  const [previousStartDate, setPreviousStartDate] = useState(startDate);
  const [modalScenario, setModalScenario] = useState(null);
  const [currentRecipient, setCurrentRecipient] = useState(null);
  const [selectedGrantCheckboxes] = useState([]);

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

  const handleRecipientChange = async (newRecipient) => {
    setCurrentRecipient(activityRecipients);
    onChangeActivityRecipients(newRecipient);

    const newRecipientGrantIds = newRecipient?.map((r) => r?.value).filter(Boolean);

    let newGoalTemplates = [];
    let citations = [];
    try {
      newGoalTemplates = newRecipientGrantIds.length > 0
        ? await getGoalTemplates(newRecipientGrantIds)
        : [];

      citations = newRecipientGrantIds.length > 0 ? await fetchCitationsByGrant(getValues('regionId'),
        newRecipientGrantIds, startDate)
        : [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch goal templates or citations:', err);
    }

    const data = {
      goalsAndObjectives,
      activityRecipients: newRecipient,
      goalTemplates: newGoalTemplates,
      citationsByGrant: citations,
    };
    const scenario = checkRecipientsAndGoals(data, hasMonitoringGoals);

    if (scenario) {
      setShouldAutoSave(false);
      setModalScenario(scenario);
      setTimeout(() => {
        modalRef.current?.toggleModal();
      }, 0);
    }
  };

  // User clicks YES (keep new recipient)
  const handleConfirmChange = () => {
    modalRef.current?.toggleModal();
    setModalScenario(null);
    setShouldAutoSave(true);
    setTimeout(() => {
      recipientSelectRef.current?.blur();
      recipientSelectRef.current?.focus();
    }, 10);
  };

  // User clicks NO (revert back)
  const handleCancelChange = () => {
    onChangeActivityRecipients(currentRecipient);
    setModalScenario(null);
    setShouldAutoSave(true);
    setTimeout(() => {
      recipientSelectRef.current?.blur();
      recipientSelectRef.current?.focus();
    }, 10);
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
      {modalScenario && (
        <ModalWithCancel
          modalRef={modalRef}
          modalId="recipient-change-warning"
          title={MODAL_CONFIG[modalScenario].title}
          okButtonText={MODAL_CONFIG[modalScenario].confirmLabel}
          cancelButtonText={MODAL_CONFIG[modalScenario].cancelLabel}
          onOk={handleConfirmChange}
          onCancel={handleCancelChange}
          showCloseX={false}
          forceAction
          hideCancelButton
        >
          {MODAL_CONFIG[modalScenario].body}
        </ModalWithCancel>
      )}
      <IndicatesRequiredField />
      <Fieldset className="smart-hub-activity-summary smart-hub--report-legend margin-top-4" legend="Who was the activity for?">
        <div className="margin-top-2 margin-bottom-0">
          {!connectionActive
         && !selectedRecipients.length
            ? <ConnectionError />
            : null}
          {hasMonitoringGoals && (
            <USWDSAlert type="info" className="margin-bottom-2">
              Changing the recipient after selecting the Monitoring goal
              may cause unintended loss of goal and objective data.
            </USWDSAlert>
          )}
          <SingleRecipientSelect
            selectedRecipients={activityRecipients}
            possibleRecipients={selectedRecipients || []}
            onChangeActivityRecipients={handleRecipientChange}
            onBlurActivityRecipients={onBlurActivityRecipients}
            selectedGrantCheckboxes={selectedGrantCheckboxes}
            selectRef={recipientSelectRef}
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
          <Drawer
            triggerRef={activityReasonRef}
            stickyHeader
            stickyFooter
            title="Why was this activity requested?"
          >
            <ContentFromFeedByTag tagName="ttahub-tta-request-option" className="ttahub-drawer--objective-topics-guidance" contentSelector="table" />
          </Drawer>
          <FormItem
            className="margin-0"
            customLabel={(
              <div className="display-flex">
                <Label className="margin-bottom-0" htmlFor="activityReason">
                  Why was this activity requested?
                </Label>
                {' '}
                <Req />
                <button
                  type="button"
                  className="usa-button usa-button--unstyled margin-left-1 activity-summary-button-no-top-margin"
                  ref={activityReasonRef}
                >
                  Get help choosing an option
                </button>
              </div>
          )}
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
                  styles={{
                    ...selectOptionsReset,
                    placeholder: (baseStyles) => ({
                      ...baseStyles,
                      color: 'black',
                      fontSize: '1rem',
                      fontWeight: '400',
                      lineHeight: '1.3',
                    }),
                  }}
                  components={{
                    DropdownIndicator: null,
                  }}
                  onChange={(selected) => {
                    controllerOnChange(selected ? selected.value : null);
                  }}
                  inputRef={register({ required: 'Select a reason why this activity was requested' })}
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
                    return 'Select a reason why this activity was requested';
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
                      pattern: { value: /^\d+(\.0|\.5)?$/, message: 'Duration must be rounded to the nearest half hour' },
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
  setShouldAutoSave: PropTypes.func.isRequired,
};

const getNumberOfParticipants = (deliveryMethod) => {
  const labelToUse = deliveryMethod === 'hybrid' ? 'Number of participants attending in person' : 'Number of participants';
  const numberOfParticipants = [
    { label: labelToUse, name: 'numberOfParticipants' },
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
      isEditSection: true,
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
      title: 'Context',
      anchor: 'context',
      items: [
        {
          label: 'Context',
          name: 'context',
          isRichText: true,
        },
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
    deliveryMethod,
  } = watch();

  return (
    <ReviewPage sections={getSections({ deliveryMethod })} path="activity-summary" />
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
    numberOfParticipantsInPerson,
    numberOfParticipantsVirtually,

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
  ];

  if (!numbersToValidate.every((num) => num && Number.isNaN(num) === false)) {
    return false;
  }

  // Handle custom validation for number of participants.
  let participantsToValidate = [];
  if (deliveryMethod === 'hybrid') {
    participantsToValidate = [
      numberOfParticipantsInPerson,
      numberOfParticipantsVirtually,
    ];
  } else {
    participantsToValidate = [numberOfParticipants];
  }

  if (!participantsToValidate.every((num) => num && Number.isNaN(num) === false)) {
    return false;
  }

  return [startDate, endDate].every((date) => moment(date, 'MM/DD/YYYY').isValid());
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
    setShouldAutoSave,
  ) => {
    const { recipients, collaborators, groups } = additionalData;
    return (
      <>
        <ActivitySummary
          recipients={recipients}
          collaborators={collaborators}
          groups={groups}
          setShouldAutoSave={setShouldAutoSave}
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
