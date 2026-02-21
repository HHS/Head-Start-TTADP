import React, { useContext, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { COMMUNICATION_METHODS, COMMUNICATION_PURPOSES, COMMUNICATION_RESULTS } from '@ttahub/common';
import {
  Alert,
  Button,
  TextInput,
  Dropdown,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import Drawer from '../../Drawer';
import ContentFromFeedByTag from '../../ContentFromFeedByTag';
import IndicatesRequiredField from '../../IndicatesRequiredField';
import FormItem from '../../FormItem';
import ControlledDatePicker from '../../ControlledDatePicker';
import { pageComplete, defaultLogValues } from '../constants';
import ReadOnlyField from '../../ReadOnlyField';
import UserContext from '../../../UserContext';
import { mustBeQuarterHalfOrWhole, NOOP } from '../../../Constants';
import MultiSelect from '../../MultiSelect';
import { useLogContext } from '../components/LogContext';
import CommunicationRecipients from '../components/CommunicationRecipients';
import HookFormRichEditor from '../../HookFormRichEditor';
import FormItemWithDrawerTriggerLabel from '../../FormItemWithDrawerTriggerLabel';
import { formatDateValue } from '../../../lib/dates';

const fields = Object.keys(defaultLogValues);

const Log = ({
  datePickerKey,
  multiGrant,
}) => {
  const {
    register,
    watch,
    control,
  } = useFormContext();

  const { user } = useContext(UserContext);
  const { regionalUsers, standardGoals } = useLogContext();
  const purposeDrawerRef = useRef(null);
  const resultDrawerRef = useRef(null);
  const communicationDate = watch('communicationDate');
  const authorName = watch('author.name');
  const isEditing = watch('isEditing');

  const otherStaffOptions = regionalUsers.map((u) => ({ ...u, value: String(u.value) }));
  const standardGoalsOptions = standardGoals.map((g) => ({ ...g, value: String(g.value) }));
  const today = useMemo(() => formatDateValue(new Date(), 'MM/DD/YYYY'), []);

  return (
    <>
      <IndicatesRequiredField />
      {(isEditing && multiGrant) && (
        <Alert type="info">
          All of the recipients on this Communication log will receive
          the same updates once edits are saved.
        </Alert>
      )}
      <input type="hidden" name="author.name" ref={register()} />
      <div className="margin-top-2">
        <ReadOnlyField label="Creator name">
          {authorName || user.name}
        </ReadOnlyField>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Other TTA staff"
          name="otherStaff"
          id="otherStaff-label"
          htmlFor="otherStaff"
          required={false}
        >
          <MultiSelect
            control={control}
            simple={false}
            name="otherStaff"
            id="otherStaff"
            options={otherStaffOptions}
            placeholderText="- Select -"
            onClick={NOOP}
            required={false}
          />
        </FormItem>
      </div>

      {multiGrant && (
        <CommunicationRecipients />
      )}

      <div className="margin-top-2">
        <FormItem
          label="Date of communication"
          name="communicationDate"
          id="communicationDate-label"
          htmlFor="communicationDate"
          required
        >
          <div
            className="usa-hint"
          >
            mm/dd/yyyy
          </div>
          <ControlledDatePicker
            key={`communicationDate-${datePickerKey}`}
            control={control}
            name="communicationDate"
            value={communicationDate}
            inputId="communicationDate"
            maxDate={today}
          />
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="Duration in hours (round to the nearest quarter hour) "
          name="duration"
        >
          <div className="maxw-card-lg">
            <TextInput
              id="duration"
              name="duration"
              type="number"
              min={0}
              max={24}
              step={0.25}
              inputRef={
                register({
                  required: 'Enter duration',
                  valueAsNumber: true,
                  validate: {
                    mustBeQuarterHalfOrWhole,
                  },
                  min: { value: 0.25, message: 'Duration must be greater than 0 hours' },
                  max: { value: 24, message: 'Duration must be less than or equal to 24 hours' },
                })
              }
              required
            />
          </div>
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="How was the communication conducted? "
          name="method"
        >
          <Dropdown
            required
            id="method"
            name="method"
            inputRef={register({ required: 'Select a communication method' })}
          >
            {COMMUNICATION_METHODS.map((option) => (
              <option key={`methodoptions${option}`}>{option}</option>
            ))}
          </Dropdown>
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItemWithDrawerTriggerLabel
          label="Purpose of communication"
          name="purpose"
          drawerTriggerRef={purposeDrawerRef}
          drawerTriggerLabel="Get help choosing a purpose"
        >
          <Dropdown
            required
            id="purpose"
            name="purpose"
            inputRef={register({ required: 'Select a purpose of communication' })}
          >
            {COMMUNICATION_PURPOSES.map((option) => (
              <option key={`purposeoptions${option}`}>{option}</option>
            ))}
          </Dropdown>
        </FormItemWithDrawerTriggerLabel>
        <Drawer
          triggerRef={purposeDrawerRef}
          stickyHeader
          stickyFooter
          title="Purpose of communication"
        >
          <ContentFromFeedByTag tagName="ttahub-commlog-purpose" />
        </Drawer>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="Select any recipient goals that this activity supports."
          name="goals"
          required={false}
        >
          <MultiSelect
            control={control}
            simple={false}
            name="goals"
            id="goals"
            options={standardGoalsOptions}
            required={false}
            placeholderText="- Select -"
          />
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItem
          label="Notes"
          name="notes"
          required={false}
        >
          <HookFormRichEditor ariaLabel="Notes" name="notes" />
        </FormItem>
      </div>
      <div className="margin-top-2">
        <FormItemWithDrawerTriggerLabel
          label="Result"
          name="result"
          drawerTriggerRef={resultDrawerRef}
          drawerTriggerLabel="Get help choosing a result"
          required={false}
        >
          <Dropdown
            id="result"
            name="result"
            inputRef={register()}
            defaultValue=""
          >
            <option value="" disabled hidden>Select one</option>
            {COMMUNICATION_RESULTS.map((option) => (
              <option key={`resultOptions${option}`}>{option}</option>
            ))}
          </Dropdown>
        </FormItemWithDrawerTriggerLabel>
        <Drawer
          triggerRef={resultDrawerRef}
          stickyHeader
          stickyFooter
          title="Result guidance"
        >
          <ContentFromFeedByTag tagName="ttahub-commlog-results" />
        </Drawer>
      </div>
    </>
  );
};

Log.propTypes = {
  datePickerKey: PropTypes.string.isRequired,
  multiGrant: PropTypes.bool,
};

Log.defaultProps = {
  multiGrant: false,
};

const path = 'log';
const position = 1;

export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

const createLogPage = (multiGrantLog = false) => ({
  position,
  label: 'Communication log',
  path,
  review: false,
  fields,
  isPageComplete,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    _onSaveDraft,
    _onUpdatePage,
    _weAreAutoSaving,
    datePickerKey,
    _onFormSubmit,
    BAlert,
  ) => (
    <div className="padding-x-1">
      <Log datePickerKey={datePickerKey} multiGrant={multiGrantLog} />
      <BAlert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
      </div>
    </div>
  ),
});

const log = createLogPage();
export const multiGrantLog = createLogPage(true);

export default log;
