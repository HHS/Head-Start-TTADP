import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Fieldset } from '@trussworks/react-uswds';
import NextStepsRepeater from './components/NextStepsRepeater';
import ReviewPage from './Review/ReviewPage';

export const isPageComplete = (formData, formState) => {
  const { isValid } = formState;
  if (isValid) {
    return true;
  }

  const { specialistNextSteps, participantNextSteps } = formData;
  if (!specialistNextSteps || !participantNextSteps) {
    return false;
  }

  if (!specialistNextSteps.length || !participantNextSteps.length) {
    return false;
  }

  if (![...specialistNextSteps, ...participantNextSteps].every((step) => step.note && moment(step.completeDate, 'MM/DD/YYYY').isValid())) {
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
        <title>Next steps</title>
      </Helmet>
      <Fieldset id="specialist-field-set" className="smart-hub--report-legend margin-top-3" legend="Specialist&apos;s next steps">
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

const sections = [
  {
    title: "Specialist's next steps",
    anchor: 'specialist-next-steps',
    items: [
      { label: 'What have you agreed to do next?', name: 'specialistNextSteps', path: 'note' },
    ],
  },
  {
    title: "Recipient's next steps",
    anchor: 'recipient-next-steps',
    items: [
      { label: 'What has the recipient agreed to do next?', name: 'recipientNextSteps', path: 'note' },
    ],
  },
];

const ReviewSection = () => (
  <ReviewPage sections={sections} path="next-steps" />
);

export default {
  position: 4,
  label: 'Next steps',
  path: 'next-steps',
  review: false,
  reviewSection: () => <ReviewSection />,
  render: (_additionalData, formData) => {
    const { activityRecipientType } = formData;
    return (<NextSteps activityRecipientType={activityRecipientType} />);
  },
  isPageComplete,
};
