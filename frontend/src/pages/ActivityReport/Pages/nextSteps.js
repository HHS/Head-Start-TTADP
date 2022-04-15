import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import { Fieldset } from '@trussworks/react-uswds';
import NextStepsRepeater from './components/NextStepsRepeater';
import FormItem from '../../../components/FormItem';
import ReviewPage from './Review/ReviewPage';

const NextSteps = ({ activityRecipientType }) => {
  // Get form context.
  const { setValue } = useFormContext();

  // Get form data values.
  const specialistNextSteps = useWatch({ name: 'specialistNextSteps' });
  const recipientNextSteps = useWatch({ name: 'recipientNextSteps' });

  // Create labels.
  const labelDisplayName = activityRecipientType === 'other-entity' ? 'Other entities' : "Recipient's";
  const tipDisplayName = activityRecipientType === 'other-entity' ? 'other entity' : 'recipient';

  // Update specialists next steps form data and state var.
  const specialistNextStepsUpdated = (updatedSpecialistSteps) => {
    setValue('specialistNextSteps', updatedSpecialistSteps);
  };

  // Update recipients next steps form data and state var.
  const recipientNextStepsUpdated = (updatedRecipientSteps) => {
    setValue('recipientNextSteps', updatedRecipientSteps);
  };

  return (
    <>
      <Helmet>
        <title>Next steps</title>
      </Helmet>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Specialist's next steps">
        <FormItem
          label="What have you agreed to do next?"
          name="specialistNextSteps"
          fieldSetWrapper
        >
          <NextStepsRepeater
            nextSteps={specialistNextSteps}
            setNextSteps={specialistNextStepsUpdated}
          />
        </FormItem>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend={`${labelDisplayName} next steps`}>
        <FormItem
          label={`what has the ${tipDisplayName} agreed to do next?`}
          name="recipientNextSteps"
          fieldSetWrapper
        >
          <NextStepsRepeater
            nextSteps={recipientNextSteps}
            setNextSteps={recipientNextStepsUpdated}
          />
        </FormItem>
      </Fieldset>
    </>
  );
};

NextSteps.propTypes = {
  activityRecipientType: PropTypes.string.isRequired,
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
