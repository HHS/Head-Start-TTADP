import React, {
  useContext, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Fieldset,
  Radio,
  Grid,
  Textarea,
  TextInput,
  Checkbox,
  Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import moment from 'moment';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import Drawer from '../../../components/Drawer';
import MultiSelect from '../../../components/MultiSelect';
import selectOptionsReset from '../../../components/selectOptionsReset';
import FormItem from '../../../components/FormItem';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import ConnectionError from '../../../components/ConnectionError';
import NetworkContext from '../../../NetworkContext';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import Req from '../../../components/Req';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import StateMultiSelect from '../../../components/StateMultiSelect';
import useHookFormEndDateWithKey from '../../../hooks/useHookFormEndDateWithKey';
import ReviewPage from '../../ActivityReport/Pages/Review/ReviewPage';
import { COLLAB_REPORT_REASONS, STATES, COLLAB_REPORT_CONDUCT_METHODS } from '../../../Constants';

const position = 1;
const path = 'activity-summary';

const ActivitySummary = ({ collaborators = [] }) => {
  const { endDateKey, setEndDate } = useHookFormEndDateWithKey();

  const {
    register,
    watch,
    control,
  } = useFormContext();

  const isStateActivity = watch('isStateActivity');
  const showStates = isStateActivity === 'true';

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const { connectionActive } = useContext(NetworkContext);
  const placeholderText = '- Select -';
  const drawerTriggerRef = useRef(null);

  const [descriptionError, setDescriptionError] = React.useState('');

  const checkForDescription = (el) => {
    const { value } = el.target;
    if (!value || value.trim() === '') {
      setDescriptionError('Enter activity description');
    } else {
      setDescriptionError('');
    }
  };

  return (
    <>
      <Helmet>
        <title>Activity Summary</title>
      </Helmet>
      <div className="cr-activity-summary-required">
        <IndicatesRequiredField />
      </div>
      <Fieldset className="smart-hub-activity-summary smart-hub--report-legend">
        <FormItem
          label="Activity name"
          name="name"
          fieldSetWrapper
        >
          <TextInput
            id="name"
            name="name"
            type="text"
            data-testid="activity-name-input"
            inputRef={register({
              required: 'Enter activity name',
            })}
          />
        </FormItem>
        <div className="margin-y-2">
          {!connectionActive ? <ConnectionError /> : null }
          <FormItem
            label="Collaborating specialists "
            name="collabReportSpecialists"
            required={false}
            tooltipText="TTA staff that you worked with during the activity."
          >
            <MultiSelect
              name="collabReportSpecialists"
              control={control}
              required={false}
              simple={false}
              labelProperty="specialist.fullName"
              valueProperty="specialistId"
              placeholderText={placeholderText}
              options={collaborators.map((user) => ({
                // we want the role construction here to match what later is returned from the
                // database, so we do this weirdo mapping thing here
                value: user.id, label: user.name, roles: user.roles.map((r) => r.fullName),
              }))}
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend">
        <h2 className="margin-top-2 margin-bottom-0">Event date</h2>
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
                label="Duration in hours"
                hint="Round to the nearest half hour"
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
      <Fieldset className="smart-hub--report-legend">
        <h2 className="margin-top-2">Reason for activity</h2>
        <FormItem
          label="What was the purpose for participating in this activity?"
          name="reportReasons"
          required
        >
          <DrawerTriggerButton className="margin-top-2" drawerTriggerRef={drawerTriggerRef}>
            Get help choosing a purpose
          </DrawerTriggerButton>

          {/* eslint-disable max-len */}
          <Drawer title="Purpose guidance" triggerRef={drawerTriggerRef}>
            <p>
              <strong>
                Participate in national, regional, state, and local work groups and meetings
              </strong>
            </p>
            <p>Your purpose in attending is to observe, gather information, and share insights.</p>
            <p>Examples include attending OCC State Administrators Meetings, CCTAN meetings, state initiative meetings, or QRIS advisory groups.</p>
            <p>
              <strong>
                Support partnerships, coordination, and collaboration with state/regional partners
              </strong>
            </p>
            <p>
              Your purpose in attending is to take an active role in planning, coordinating, or supporting collaboration between TTA and the partners.
            </p>
            <p>
              Examples include participating in state HSA meetings to help plan conferences, supporting state health advisory groups, or supporting HSCO work.
            </p>
            <p>
              <strong>
                Aggregate, analyze, and/or present regional data
              </strong>
            </p>
            <p>
              Your purpose in attending is to share data about Head Start recipients or TTA to inform the work of the group.
            </p>
            <p>
              Examples include sharing TTA about PIR data around family engagement with a family engagement initiative, sharing TTA data to inform the state PD system about recipient needs, or prepare data reports for RO.
            </p>
            <p>
              <strong>
                Develop and provide presentations, training, and resources to RO and/or state/regional partners
              </strong>
            </p>
            <p>
              Your purpose in attending is to conduct a training and present content.
            </p>
            <p>
              Examples include training for PSs about licensing in the states, presenting content at a state health advisory group meeting, or a presentation for RPM/RPD.
            </p>
          </Drawer>
          {/* eslint-enable max-len */}

          <Checkbox
            className="margin-top-2"
            id="participate"
            name="reportReasons"
            value="participate_work_groups"
            label="Participate in national, regional, state, and local work groups and meetings"
            inputRef={register({ required: 'Select at least one' })}
          />
          <Checkbox
            className="margin-top-2"
            id="support"
            name="reportReasons"
            value="support_coordination"
            label="Support partnerships, coordination, and collaboration with state/regional partners"
            inputRef={register({ required: 'Select at least one' })}
          />
          <Checkbox
            className="margin-top-2"
            id="aggregate"
            name="reportReasons"
            value="agg_regional_data"
            label="Aggregate, analyze, and/or present regional data"
            inputRef={register({ required: 'Select at least one' })}
          />
          <Checkbox
            className="margin-top-2"
            id="develop"
            name="reportReasons"
            value="develop_presentations"
            label="Develop and provide presentations, training, and resources to RO and/or state/regional partners"
            inputRef={register({ required: 'Select at least one' })}
          />
        </FormItem>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend">
        <FormItem
          label="Was this a regional or state activity?"
          name="isStateActivity"
          required
        >
          <Radio
            id="regional"
            name="isStateActivity"
            value="false"
            label="Regional"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
            required
          />
          <Radio
            id="state"
            name="isStateActivity"
            value="true"
            label="State"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />
        </FormItem>
      </Fieldset>
      {showStates && (
        <Fieldset className="smart-hub--report-legend">
          <FormItem
            label="Choose the states involved"
            name="statesInvolved"
            required
          >
            <StateMultiSelect
              name="statesInvolved"
              control={control}
              required
            />
          </FormItem>
        </Fieldset>
      )}
      <Fieldset className="smart-hub--report-legend">
        <FormItem
          label="How was the activity conducted?"
          name="conductMethod"
          required
        >
          <Controller
            render={({ onChange: controllerOnChange, value, onBlur }) => (
              <Select
                value={
                    value
                      ? {
                        value,
                        label: COLLAB_REPORT_CONDUCT_METHODS.filter((m) => (
                          m.value === value
                        ))[0]?.label || null,
                      }
                      : null
}
                inputId="conductMethodSelect"
                name="conductMethodSelect"
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
                onChange={(selected) => {
                  controllerOnChange(selected ? selected.value : null);
                }}
                inputRef={register({ required: 'How was the activity conducted?' })}
                options={COLLAB_REPORT_CONDUCT_METHODS}
                onBlur={onBlur}
                required
                isMulti={false}
              />
            )}
            control={control}
            rules={{
              validate: (value) => {
                if (!value) {
                  return 'Select a reason why this activity was requested';
                }
                return true;
              },
            }}
            name="conductMethod"
            defaultValue={null}
          />
        </FormItem>
      </Fieldset>
      <Fieldset className={`smart-hub--report-legend ${descriptionError ? 'usa-form-group--error' : ''}`}>
        <Label htmlFor="description">
          Activity description
          {' '}
          <Req />
        </Label>

        {descriptionError && (
        <span className="usa-error-message" role="alert">Enter description</span>
        )}

        <Textarea
          id="description"
          className="height-10 minh-5 smart-hub--text-area__resize-vertical"
          name="description"
          defaultValue=""
          data-testid="description-input"
          error={!!descriptionError}
          inputRef={register({ required: true })}
          onBlur={checkForDescription}
          required
        />
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
};

export const isPageComplete = (hookForm) => {
  const { getValues } = hookForm;
  const formData = getValues();

  const {
    // strings
    name,
    description,
    conductMethod,

    // arrays
    reportReasons,
    statesInvolved,

    // numbers
    duration,

    // radio values
    isStateActivity,

    // dates
    startDate,
    endDate,
  } = formData;

  const stringsToValidate = [
    name,
    description,
    conductMethod,
  ];

  if (!stringsToValidate.every((str) => str)) {
    return false;
  }

  const arraysToValidate = [
    reportReasons,
  ];

  if (!arraysToValidate.every((arr) => arr.length)) {
    return false;
  }

  if (isStateActivity === null) {
    return false;
  }

  if (isStateActivity === 'true' && (!statesInvolved || !statesInvolved.length)) {
    return false;
  }

  const numbersToValidate = [
    duration,
  ];

  if (!numbersToValidate.every((num) => num && Number.isNaN(num) === false)) {
    return false;
  }

  if (![startDate, endDate].every((date) => moment(date, 'MM/DD/YYYY').isValid())) {
    return false;
  }

  return true;
};

const ReviewSection = () => {
  const { getValues } = useFormContext();
  const {
    name,
    collabReportSpecialists,
    startDate,
    endDate,
    duration,
    description,
    reportReasons,
    isStateActivity,
    statesInvolved,
    conductMethod,
  } = getValues();

  const sections = [
    {
      anchor: 'activity-for',
      items: [
        { label: 'Activity name', name: 'name', customValue: { name } },
        { label: 'Collaborating specialists', name: 'collabReportSpecialists', customValue: { collabReportSpecialists: collabReportSpecialists?.map(({ specialist }) => specialist.fullName).join(', ') || '' } },
      ],
    },
    {
      title: 'Activity date',
      anchor: 'date',
      items: [
        { label: 'Start date', name: 'startDate', customValue: { startDate } },
        { label: 'End date', name: 'endDate', customValue: { endDate } },
        { label: 'Duration', name: 'duration', customValue: { duration } },
      ],
    },
    {
      title: 'Reason for activity',
      anchor: 'reasons',
      items: [
        { label: 'Activity purpose', name: 'purpose', customValue: { purpose: Array.isArray(reportReasons) ? reportReasons?.map((r) => COLLAB_REPORT_REASONS[r] || '').join(', ') : '' } },
        { label: 'Activity type', name: 'type', customValue: { type: isStateActivity === 'true' ? 'State' : 'Regional' } },
        ...(isStateActivity === 'true' ? [
          { label: 'States involved', name: 'states', customValue: { states: Array.isArray(statesInvolved) ? statesInvolved?.map((s) => STATES[s.value] || '').join(', ') : '' } },
        ] : []),
        {
          label: 'Activity method',
          name: 'conductMethod',
          customValue: {
            conductMethod: COLLAB_REPORT_CONDUCT_METHODS.filter((m) => (
              m.value === conductMethod
            ))[0]?.label || 'None selected',
          },
        },
        { label: 'Activity description', name: 'description', customValue: { description } },
      ],
    },
  ];

  return <ReviewPage sections={sections} path={path} isCustomValue />;
};

export default {
  position,
  label: 'Activity summary',
  path,
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
    DraftAlert,
  ) => {
    const { collaborators } = additionalData;
    return (
      <>
        <ActivitySummary
          collaborators={collaborators}
        />
        <DraftAlert />
        <NavigatorButtons
          isAppLoading={isAppLoading}
          onContinue={onContinue}
          onSaveDraft={onSaveDraft}
          path={path}
          position={position}
          onUpdatePage={onUpdatePage}
        />
      </>
    );
  },
  isPageComplete,
};
