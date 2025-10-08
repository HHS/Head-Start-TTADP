import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Fieldset } from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NextStepsRepeater from './components/NextStepsRepeater';
import ReviewPage from '../../ActivityReport/Pages/Review/ReviewPage';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';

const path = 'next-steps';
const position = 3;

const NextSteps = () => {
  const { watch, setValue } = useFormContext();
  const steps = watch('steps');

  useEffect(() => {
    if (!steps || steps.length === 0) {
      // If no steps, add an empty one.
      steps.push({ collabStepDetail: '', collabStepCompleteDate: '' });
      setValue('steps', steps);
    }
  }, [steps, setValue]);

  return (
    <>
      <Helmet>
        <title>Next Steps</title>
      </Helmet>
      <IndicatesRequiredField />
      <Fieldset id="next-steps-field-set" className="smart-hub--report-legend margin-top-4" legend="What have you agreed to do next?">
        <NextStepsRepeater
          id="next-steps-repeater-id"
          name="steps"
          ariaName="Next Steps"
        />
      </Fieldset>
    </>
  );
};

const getNextStepsSections = (steps) => {
  const nextStepItems = (steps || []).map((step, index) => ([
    {
      label: `Step ${index + 1}`,
      name: 'step',
      customValue: { step: step.collabStepDetail },
    },
    {
      label: 'Anticipated completion',
      name: 'date',
      customValue: { date: step.collabStepCompleteDate },
    },
  ]));

  return [
    {
      isEditSection: true,
      anchor: 'next-steps',
      items: [...nextStepItems.flatMap((item) => item)],
    },
  ];
};

export const isPageComplete = (hookForm) => {
  const { getValues } = hookForm;
  const { steps } = getValues();

  if (!steps || steps.length === 0) {
    return false;
  }

  const allStepsComplete = steps.every((
    { collabStepDetail: detail, collabStepCompleteDate: date },
  ) => (
    detail !== null && detail !== '' && date !== null && date !== ''));
  return allStepsComplete;
};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    steps,
  } = watch();
  return (
    <ReviewPage sections={getNextStepsSections(steps)} path="next-steps" />);
};

export default {
  position,
  label: 'Next steps',
  path,
  review: false,
  reviewSection: () => (
    <ReviewSection />
  ),
  render: (
    _additionalData,
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
  ) => (
    <>
      <NextSteps />
      <Alert />
      <NavigatorButtons
        isAppLoading={isAppLoading}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        path={path}
        position={position}
      />
    </>
  ),
  isPageComplete,
};
