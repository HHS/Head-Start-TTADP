import React from 'react';
import moment from 'moment';
import { Helmet } from 'react-helmet';
import {
  Button,
  Fieldset,
} from '@trussworks/react-uswds';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import {
  nextStepsFields,
} from '../constants';
import NextStepsRepeater from '../../ActivityReport/Pages/components/NextStepsRepeater';

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

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const formData = hookForm.getValues();

  const { specialistNextSteps, recipientNextSteps } = formData;

  if (!specialistNextSteps.length || !recipientNextSteps.length) {
    return false;
  }

  if (![...specialistNextSteps, ...recipientNextSteps].every((step) => step.note && moment(step.completeDate, 'MM/DD/YYYY').isValid())) {
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
    _additionalData,
    formData,
    _reportId,
    isAppLoading,
    _onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <NextSteps formData={formData} />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>Review and submit</Button>
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
