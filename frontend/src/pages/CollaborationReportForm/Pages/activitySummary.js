import React, {
  useContext, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
// import { isUndefined } from 'lodash';
import {
  Fieldset,
  Radio,
  Grid,
  Textarea,
  TextInput,
  Checkbox,
  Label,
} from '@trussworks/react-uswds';
import moment from 'moment';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import Drawer from '../../../components/Drawer';
import MultiSelect from '../../../components/MultiSelect';
import FormItem from '../../../components/FormItem';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import ConnectionError from '../../../components/ConnectionError';
import NetworkContext from '../../../NetworkContext';
// import HtmlReviewItem from './Review/HtmlReviewItem';
// import Section from './Review/ReviewSection';
// import { reportIsEditable } from '../../../utils';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import Req from '../../../components/Req';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import StateMultiSelect from '../../../components/StateMultiSelect';
import './activitySummary.scss';
import useHookFormEndDateWithKey from '../../../hooks/useHookFormEndDateWithKey';

const ActivitySummary = ({ collaborators = [] }) => {
  const { endDateKey, setEndDate } = useHookFormEndDateWithKey();

  const {
    register,
    watch,
    control,
    // clearErrors,
  } = useFormContext();

  const isStateActivity = watch('isStateActivity');
  const showStates = isStateActivity === 'true';

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const { connectionActive } = useContext(NetworkContext);
  const placeholderText = '- Select -';
  const drawerTriggerRef = useRef(null);

  const deliveryMethodOptions = [
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'In person', value: 'in_person' },
    { label: 'Virtual', value: 'virtual' },
  ];

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
              labelProperty="name"
              valueProperty="value"
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
          <MultiSelect
            name="conductMethod"
            control={control}
            options={deliveryMethodOptions}
            required
          />
        </FormItem>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend">
        <Label htmlFor="description">
          Activity description
          {' '}
          <Req />
        </Label>
        <Textarea
          id="description"
          className="height-10 minh-5 smart-hub--text-area__resize-vertical"
          name="description"
          defaultValue=""
          data-testid="description-input"
          inputRef={register()}
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

// const sections = [
//   {
//     title: 'Who was the activity for?',
//     anchor: 'activity-for',
//     items: [
//       { label: 'Recipient or other entity', name: 'activityRecipientType', sort: true },
//       { label: 'Activity participants', name: 'activityRecipients', path: 'name' },
//       { label: 'Target populations addressed', name: 'targetPopulations', sort: true },
//     ],
//   },
//   {
//     title: 'Reason for activity',
//     anchor: 'reasons',
//     items: [
//       { label: 'Requested by', name: 'requester' },
//       { label: 'Reasons', name: 'reason', sort: true },
//     ],
//   },
//   {
//     title: 'Activity date',
//     anchor: 'date',
//     items: [
//       { label: 'Start date', name: 'startDate' },
//       { label: 'End date', name: 'endDate' },
//       { label: 'Duration', name: 'duration' },
//     ],
//   },
//   {
//     title: 'Training or Technical Assistance',
//     anchor: 'tta',
//     items: [
//       { label: 'TTA type', name: 'ttaType' },
//       { label: 'Language used', name: 'language' },
//       { label: 'Conducted', name: 'deliveryMethod' },
//     ],
//   },
//   {
//     title: 'Other participants',
//     anchor: 'other-participants',
//     items: [
//       { label: 'Recipient participants', name: 'participants', sort: true },
//       { label: 'Number of participants', name: 'numberOfParticipants' },
//     ],
//   },
// ];

const ReviewSection = () => <div>Activity name</div>;

// TODO: Abandoned review section
// const { watch } = useFormContext();
// const {
//   context,
//   calculatedStatus,
// } = watch();

// const canEdit = reportIsEditable(calculatedStatus);
// return (
//   <>
//     {/* <ReviewPage sections={sections} path="activity-summary" /> */}
//     {/* eslint-disable-next-line react/jsx-no-undef */}
//     <Section
//       hidePrint={isUndefined(context)}
//       key="context"
//       basePath="activity-summary"
//       anchor="context"
//       title="Context"
//       canEdit={canEdit}
//     >
//       {/* eslint-disable-next-line react/jsx-no-undef */}
//       <HtmlReviewItem
//         label="Context"
//         name="context"
//       />
//     </Section>
//   </>
// );

export const isPageComplete = (formData, formState) => {
  const { isValid } = formState;
  if (isValid) {
    return true;
  }

  const {
    // strings
    name,
    description,

    // arrays
    reportReasons,
    statesInvolved,
    conductMethod,

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
  ];

  if (!stringsToValidate.every((str) => str)) {
    return false;
  }

  const arraysToValidate = [
    reportReasons,
    conductMethod,
  ];

  if (!arraysToValidate.every((arr) => arr.length)) {
    return false;
  }

  // Check statesInvolved only if isStateActivity is 'true'
  if (isStateActivity === 'true' && !statesInvolved.length) {
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

export default {
  position: 0,
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
    const { collaborators } = additionalData;
    return (
      <>
        <ActivitySummary
          collaborators={collaborators}
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
