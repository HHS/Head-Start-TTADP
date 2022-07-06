import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Fieldset, Label } from '@trussworks/react-uswds';
import NextStepsRepeater from './components/NextStepsRepeater';
import ReviewPage from './Review/ReviewPage';

const NextSteps = ({ activityRecipientType }) => {
  // Create labels.
  const labelDisplayName = activityRecipientType === 'other-entity' ? 'Other entities' : "Recipient's";

  return (
    <>
      <Helmet>
        <title>Next steps</title>
      </Helmet>
      <Fieldset id="specialist-field-set" key="specialist-field-set" className="smart-hub--report-legend margin-top-3">
        <Label htmlFor="input-type-text" error>Specialist&apos;s next steps</Label>
        <NextStepsRepeater
          id="specialist-next-steps-repeater-id"
          key="specialist-next-steps-repeater"
          name="specialistNextSteps"
          ariaName="Specialist Next Steps"
        />
      </Fieldset>
      <Fieldset id="recipient-field-set" key="recipient-field-set" className="smart-hub--report-legend margin-top-3">
        <Label htmlFor="input-type-text" error>{`${labelDisplayName} next steps`}</Label>
        <NextStepsRepeater
          id="recipient-next-steps-repeater-id"
          key="recipient-next-steps-repeater"
          name="recipientNextSteps"
          ariaName="Recipient Next Steps"
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
};
