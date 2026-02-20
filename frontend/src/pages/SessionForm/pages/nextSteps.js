import React from 'react';
import { parse, isValid } from 'date-fns';
import { Helmet } from 'react-helmet';
import {
  Button,
  Fieldset,
} from '@trussworks/react-uswds';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import {
  nextStepsFields,
} from '../constants';
import NextStepsRepeater from '../../ActivityReport/Pages/components/NextStepsRepeater';
import { getNextStepsSections } from '../../ActivityReport/Pages/nextSteps';
import ReviewPage from '../../ActivityReport/Pages/Review/ReviewPage';

const NextSteps = () => (
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
    <Fieldset id="recipient-field-set" className="smart-hub--report-legend margin-top-3" legend={'Recipient\'s next steps'}>
      <NextStepsRepeater
        id="recipient-next-steps-repeater-id"
        name="recipientNextSteps"
        ariaName={'Recipient\'s next steps'}
        recipientType="recipient"
      />
    </Fieldset>
  </>
);

const fields = Object.keys(nextStepsFields);
const path = 'next-steps';
const position = 4;

const ReviewSection = () => {
  const { getValues } = useFormContext();
  const {
    specialistNextSteps,
    recipientNextSteps,
  } = getValues();
  return (
    <ReviewPage sections={getNextStepsSections(specialistNextSteps, recipientNextSteps)} path="next-steps" isCustomValue />);
};

export const isPageComplete = (hookForm) => {
  const formData = hookForm.getValues();

  const { specialistNextSteps, recipientNextSteps } = formData;

  if (!specialistNextSteps || !recipientNextSteps) {
    return false;
  }

  if (!specialistNextSteps.length || !recipientNextSteps.length) {
    return false;
  }

  if (![...specialistNextSteps, ...recipientNextSteps].every((step) => step.note && isValid(parse(step.completeDate, 'MM/dd/yyyy', new Date())))) {
    return false;
  }

  return true;
};

export default {
  position,
  label: 'Next steps',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  render: (
    additionalData,
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
  ) => (
    <div className="padding-x-1">
      <NextSteps formData={formData} />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>{additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE ? 'Save and continue' : 'Continue' }</Button>
        {
          // if status is 'Completed' then don't show the save draft button.
          formData.status !== TRAINING_REPORT_STATUSES.COMPLETE && (
            <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
          )
        }
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
