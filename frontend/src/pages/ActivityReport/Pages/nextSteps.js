import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import { Fieldset, Label } from '@trussworks/react-uswds';
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
      <Fieldset id="specialist-field-set" key="specialist-field-set" className="smart-hub--report-legend margin-top-3">
        <Label htmlFor="input-type-text" error>Specialist&apos;s next steps</Label>
        <FormItem
          id="specialist-next-steps-form-item"
          key="specialist-next-steps-form-item"
          label="What have you agreed to do next?"
          name="specialistNextSteps"
          fieldSetWrapper
        >
          <NextStepsRepeater
            id="specialist-next-steps-repeater-id"
            key="specialist-next-steps-repeater"
            stepType="specialist"
            nextSteps={specialistNextSteps}
            setNextSteps={specialistNextStepsUpdated}
          />
        </FormItem>
      </Fieldset>
      <Fieldset id="recipient-field-set" key="recipient-field-set" className="smart-hub--report-legend margin-top-3">
        <Label htmlFor="input-type-text" error>{`${labelDisplayName} next steps`}</Label>
        <FormItem
          id="recipient-next-steps-form-item"
          key="recipient-next-steps-form-item"
          label={`What has the ${tipDisplayName} agreed to do next?`}
          name="recipientNextSteps"
          fieldSetWrapper
        >
          <NextStepsRepeater
            id="recipient-next-steps-repeater-id"
            key="recipient-next-steps-repeater"
            stepType="recipient"
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
