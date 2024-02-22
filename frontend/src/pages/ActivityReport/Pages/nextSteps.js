import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Fieldset } from '@trussworks/react-uswds';
import NextStepsRepeater from './components/NextStepsRepeater';
import ReviewPage from './Review/ReviewPage';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';

export const isPageComplete = (formData, formState) => {
  const { isValid } = formState;
  if (isValid) {
    return true;
  }

  const { specialistNextSteps, recipientNextSteps } = formData;
  if (!specialistNextSteps || !recipientNextSteps) {
    return false;
  }

  if (!specialistNextSteps.length || !recipientNextSteps.length) {
    return false;
  }

  if (![...specialistNextSteps, ...recipientNextSteps].every((step) => step.note && moment(step.completeDate, 'MM/DD/YYYY').isValid())) {
    return false;
  }

  return true;
};

const NextSteps = ({ activityRecipientType }) => {
  // Create labels.
  const labelDisplayName = activityRecipientType === 'other-entity' ? 'Other entities' : "Recipient's";

  return (
    <>
      <Helmet>
        <title>Next Steps</title>
      </Helmet>
      <IndicatesRequiredField />
      <Fieldset id="specialist-field-set" className="smart-hub--report-legend margin-top-4" legend="Specialist&apos;s next steps">
        <NextStepsRepeater
          id="specialist-next-steps-repeater-id"
          name="specialistNextSteps"
          ariaName="Specialist Next Steps"
        />
      </Fieldset>
      <Fieldset id="recipient-field-set" className="smart-hub--report-legend margin-top-3" legend={`${labelDisplayName} next steps`}>
        <NextStepsRepeater
          id="recipient-next-steps-repeater-id"
          name="recipientNextSteps"
          ariaName={`${labelDisplayName} next steps`}
          recipientType={activityRecipientType}
        />
      </Fieldset>
    </>
  );
};

NextSteps.propTypes = {
  activityRecipientType: PropTypes.string,
};

NextSteps.defaultProps = {
  activityRecipientType: '',
};

const getNextStepsSections = (activityRecipientType) => {
  const isRecipient = activityRecipientType === 'recipient';
  const labelDisplayName = isRecipient ? "Recipient's" : 'Other entity\'s';
  const subtitleDisplayText = isRecipient ? 'recipient' : 'other entity';
  return [
    {
      title: "Specialist's next steps",
      anchor: 'specialist-next-steps',
      items: [
        { label: 'What have you agreed to do next?', name: 'specialistNextSteps', path: 'note' },
        { label: 'Anticipated completion', name: 'specialistNextSteps', path: 'completeDate' },
      ],
    },
    {
      title: `${labelDisplayName} next steps`,
      anchor: 'recipient-next-steps',
      items: [
        { label: `What has the ${subtitleDisplayText} agreed to do next?`, name: 'recipientNextSteps', path: 'note' },
        { label: 'Anticipated completion', name: 'recipientNextSteps', path: 'completeDate' },
      ],
    },
  ];
};

const ReviewSection = ({ activityRecipientType }) => (
  <ReviewPage sections={getNextStepsSections(activityRecipientType)} path="next-steps" />
);

ReviewSection.propTypes = {
  activityRecipientType: PropTypes.string.isRequired,
};

export default {
  position: 4,
  label: 'Next steps',
  path: 'next-steps',
  review: false,
  reviewSection: (activityRecipientType) => (
    <ReviewSection activityRecipientType={activityRecipientType} />
  ),
  render: (
    _additionalData,
    formData,
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
    const { activityRecipientType } = formData;
    return (
      <>
        <NextSteps activityRecipientType={activityRecipientType} />
        <Alert />
        <NavigatorButtons
          isAppLoading={isAppLoading}
          onContinue={onContinue}
          onSaveDraft={onSaveDraft}
          onUpdatePage={onUpdatePage}
          path="next-steps"
          position={4}
        />
      </>
    );
  },
  isPageComplete,
};
