import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import {
  Fieldset, Button, Textarea,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import NextStepsRepeater from './components/NextStepsRepeater';
import ContextMenu from '../../../components/ContextMenu';
import FormItem from '../../../components/FormItem';
import ReviewPage from './Review/ReviewPage';

const NextSteps = ({ activityRecipientType }) => {
  const {
    register, control, setValue, trigger,
  } = useFormContext();

  const [specialistNextSteps, setSpecialistNextSteps] = useState([]);
  const [recipientNextSteps, setRecipientNextSteps] = useState([]);

  const labelDisplayName = activityRecipientType === 'other-entity' ? 'Other entities' : "Recipient's";
  const tipDisplayName = activityRecipientType === 'other-entity' ? 'other entity' : 'recipient';

  const specialistNextStepsUpdated = (updatedSteps) => setSpecialistNextSteps(updatedSteps);
  const recipientNextStepsUpdated = (updatedSteps) => setRecipientNextSteps(updatedSteps);

  /*
  const notes = useWatch({ name, control });

  const [showPrompt, updateShowPrompt] = useState(false);
  const [targetIndex, updateTargetIndex] = useState(-1);

  useEffect(() => {
    register({ name }, { validate: (allNotes) => (allNotes.length !== 0 ? true : `${humanName} requires at least one step`) });
  });
  */
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
