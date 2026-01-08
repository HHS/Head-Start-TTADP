import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import {
  Fieldset,
  Radio,
  TextInput,
} from '@trussworks/react-uswds';
import { COLLAB_REPORT_PARTICIPANTS } from '@ttahub/common';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import MultiSelect from '../../../components/MultiSelect';
import FormItem from '../../../components/FormItem';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import ReviewPage from '../../ActivityReport/Pages/Review/ReviewPage';
import { COLLAB_REPORT_DATA } from '../../../Constants';

const path = 'supporting-information';
const position = 2;

const SupportingInformation = ({ goalTemplates = [] }) => {
  const {
    register,
    watch,
    control,
  } = useFormContext();

  // Watch the participants field to determine if "other" is selected
  const selectedParticipants = watch('participants');
  const showOtherParticipant = selectedParticipants && selectedParticipants.some((p) => p.value === 'Other'); // note that 'Other' needs to be uppercase for this collection

  // Map the participants to a format suitable for the MultiSelect component
  const participantOptions = COLLAB_REPORT_PARTICIPANTS?.map(
    (participant) => ({ label: participant, value: participant }),
  ) || [];

  // Watch the hasDataUsed field to conditionally require data selections
  const hasDataUsed = watch('hasDataUsed');
  const showDataUsedOptions = hasDataUsed === 'true';

  useEffect(() => {
    if (hasDataUsed !== 'true') {
      // Clear dataUsed and otherDataUsed if hasDataUsed is not "true"
      control.setValue('dataUsed', []);
      control.setValue('otherDataUsed', '');
    }
  }, [hasDataUsed, control]);

  // Map the "Data Used" options for the MultiSelect component
  const dataUsedOptions = Object.entries(COLLAB_REPORT_DATA).map(
    ([key, value]) => ({ label: value, value: key }),
  );

  // Watch the dataUsed field to determine if "other" is selected
  const selectedDataUsed = watch('dataUsed');
  const showOtherDataUsed = selectedDataUsed?.some((d) => d.value === 'other'); // note that 'other' needs to be lowercase for the dataUsed collection

  // Watch the hasDataUsed field to conditionally require data selections
  const hasGoals = watch('hasGoals');
  const showGoalsOptions = hasGoals === 'true';

  useEffect(() => {
    if (hasGoals !== 'true') {
      // Clear dataUsed and otherDataUsed if hasDataUsed is not "true"
      control.setValue('goals', []);
    }
  }, [hasGoals, control]);

  // Fetch goal templates using the custom hook
  const goalsOptions = (goalTemplates || []).map((template) => ({
    label: template.standard,
    value: template.id,
  }));

  return (
    <>
      <Helmet>
        <title>Supporting information</title>
      </Helmet>
      <div className="cr-activity-summary-required">
        <IndicatesRequiredField />
      </div>
      <Fieldset className="smart-hub--report-legend">
        <FormItem
          label="Who participated in the activity?"
          name="participants"
          required
        >
          <MultiSelect
            name="participants"
            control={control}
            options={participantOptions}
            simple={false}
            labelProperty="label"
            valueProperty="value"
            rules={{
              validate: (value) => {
                if (!value.length) {
                  return 'Select at least one';
                }
                return true;
              },
            }}
            required
          />
        </FormItem>
      </Fieldset>
      {showOtherParticipant && (
        <Fieldset className="smart-hub--report-legend">
          <FormItem
            label="Others who participated"
            name="otherParticipants"
            fieldSetWrapper
          >
            <TextInput
              id="otherParticipants"
              name="otherParticipants"
              type="text"
              inputRef={register({
                required: 'Enter other participants',
              })}
            />
          </FormItem>
        </Fieldset>
      )}
      <Fieldset className="smart-hub--report-legend">
        <FormItem
          label="Did you collect, use, and/or share data during this activity?"
          name="hasDataUsed"
          required
        >
          <Radio
            id="yesDataUsed"
            name="hasDataUsed"
            value="true"
            label="Yes"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
            required
          />
          <Radio
            id="noDataUsed"
            name="hasDataUsed"
            value="false"
            label="No"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />
        </FormItem>
      </Fieldset>
      {showDataUsedOptions && (
        <Fieldset className="smart-hub--report-legend">
          <FormItem
            label="What data did you collect, use, and/or share during this activity?"
            name="dataUsed"
            required
          >
            <MultiSelect
              name="dataUsed"
              control={control}
              options={dataUsedOptions}
              simple={false}
              labelProperty="label"
              valueProperty="value"
              rules={{
                validate: (value) => {
                  if (!value.length) {
                    return 'Select at least one';
                  }
                  return true;
                },
              }}
              required
            />
          </FormItem>
        </Fieldset>
      )}
      {showOtherDataUsed && (
        <Fieldset className="smart-hub--report-legend">
          <FormItem
            label="Other data collected"
            name="otherDataUsed"
            fieldSetWrapper
            required
          >
            <TextInput
              id="otherDataUsed"
              name="otherDataUsed"
              type="text"
              inputRef={register({
                required: 'Enter other data',
              })}
            />
          </FormItem>
        </Fieldset>
      )}
      <Fieldset className="smart-hub--report-legend">
        <FormItem
          label="Does the content of this activity help recipients in your region support their goals?"
          name="hasGoals"
          required
        >
          <Radio
            id="yesGoals"
            name="hasGoals"
            value="true"
            label="Yes"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
            required
          />
          <Radio
            id="noGoals"
            name="hasGoals"
            value="false"
            label="No"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />
        </FormItem>
      </Fieldset>
      {showGoalsOptions && (
        <Fieldset className="smart-hub--report-legend">
          <FormItem
            label="Select the goals that this activity supports"
            name="goals"
            required
          >
            <MultiSelect
              name="goals"
              control={control}
              options={goalsOptions}
              simple={false}
              labelProperty="label"
              valueProperty="value"
              rules={{
                validate: (value) => {
                  if (!value.length) {
                    return 'Select at least one';
                  }
                  return true;
                },
              }}
              required
            />
          </FormItem>
        </Fieldset>
      )}
    </>
  );
};

SupportingInformation.propTypes = {
  goalTemplates: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    standard: PropTypes.string.isRequired,
  })).isRequired,
};

// istanbul ignore next - too hard to test because of the hookForm instance
export const isPageComplete = (hookForm) => {
  const { getValues } = hookForm;
  const formData = getValues();
  const {
    participants,
    otherParticipants,
    hasDataUsed,
    dataUsed,
    otherDataUsed,
    hasGoals,
    goals,
  } = formData;

  // Check if participants is provided
  if (!participants || participants.length === 0) {
    return false;
  }

  // Check if "Other" is selected in participants but not provided
  if (participants.some((p) => p.value === 'Other') && !otherParticipants) {
    return false;
  }

  // Check if hasDataUsed is not null
  if (hasDataUsed === null) {
    return false;
  }

  // Check if hasDataUsed and dataUsed is provided
  if (hasDataUsed === 'true' && (!dataUsed || dataUsed.length === 0)) {
    return false;
  }

  // Check if data used and "other" selected but not provided
  if (hasDataUsed === 'true' && dataUsed.some((d) => d.value === 'other') && !otherDataUsed) {
    return false;
  }

  // Check if hasGoals is not null
  if (hasGoals === null) {
    return false;
  }

  // Check if hasGoals and goals is provided
  if (hasGoals === 'true' && (!goals || goals.length === 0)) {
    return false;
  }

  // Otherwise, all looks good!
  return true;
};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    participants,
    otherParticipants,
    hasDataUsed,
    dataUsed,
    otherDataUsed,
    hasGoals,
    goals,
  } = watch();

  let participantsToDisplay = 'None provided';
  if (participants && participants.length > 0) {
    participantsToDisplay = participants.map((p) => p.label).join(', ');
    if (participants.some((p) => p.value === 'Other') && otherParticipants) {
      participantsToDisplay += `: ${otherParticipants}`;
    }
  }

  let dataToDisplay = '';
  if (dataUsed && dataUsed.length > 0) {
    dataToDisplay = dataUsed.map((d) => {
      if (!Object.keys(COLLAB_REPORT_DATA).includes(d.value)) return '';
      return d.label;
    }).join(', ');
    if (dataUsed.some((d) => d.value === 'other') && otherDataUsed) {
      dataToDisplay += `: ${otherDataUsed}`;
    }
  } else if (hasDataUsed === null) {
    dataToDisplay = 'None provided';
  } else {
    dataToDisplay = 'None';
  }

  let goalsToDisplay = '';
  if (goals && goals.length > 0) {
    goalsToDisplay = goals.map((g) => g.label).join(', ');
  } else if (hasGoals === null) {
    goalsToDisplay = 'None provided';
  } else {
    goalsToDisplay = 'None';
  }

  const sections = [
    {
      anchor: 'support-information',
      items: [
        { label: 'Participants', name: 'participants', customValue: { participants: participantsToDisplay } },
        { label: 'Data collected/shared', name: 'data', customValue: { data: dataToDisplay } },
        { label: 'Supporting goals', name: 'goals', customValue: { goals: goalsToDisplay } },
      ],
    },
  ];

  return <ReviewPage sections={sections} path={path} isCustomValue />;
};

export default {
  position,
  label: 'Supporting information',
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
    Alert,
  ) => {
    const { goalTemplates } = additionalData;
    return (
      <>
        <SupportingInformation goalTemplates={goalTemplates} />
        <Alert />
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
