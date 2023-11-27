import React from 'react';
import { Helmet } from 'react-helmet';
import {
  Button,
  Fieldset,
} from '@trussworks/react-uswds';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';
import { nextStepsFields } from '../constants';
import NextStepsRepeater from '../../../../ActivityReport/Pages/components/NextStepsRepeater';
import { isPageComplete } from '../../../../SessionForm/pages/nextSteps';

const NextSteps = () => (
  <>
    <Helmet>
      <title>Next steps</title>
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
const position = 3;

const ReviewSection = () => <><h2>Event summary</h2></>;

export default {
  position,
  label: 'Next steps',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    _onContinue,
    _onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <NextSteps />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>Save log</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
