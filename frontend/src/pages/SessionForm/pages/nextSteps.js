import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Fieldset,
} from '@trussworks/react-uswds';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import {
  nextStepsFields,
} from '../constants';
import NextStepsRepeater from '../../ActivityReport/Pages/components/NextStepsRepeater';
import UserContext from '../../../UserContext';

const NextSteps = ({ formData }) => {
  const { user } = useContext(UserContext);
  const { register } = useFormContext();
  const isPoc = (() => {
    if (!formData.event || !formData.event.pocIds) {
      return false;
    }
    return formData.event.pocIds.includes(user.id);
  })();

  return (
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
      {isPoc ? (
        <>
          <Checkbox
            id="pocComplete"
            name="pocComplete"
            label="Email the event creator and collaborator to let them know my work is complete."
            className="margin-top-2"
            inputRef={register()}
          />
        </>
      ) : <input type="hidden" id="pocComplete" name="pocComplete" ref={register()} />}
    </>
  );
};

NextSteps.propTypes = {
  formData: PropTypes.shape({
    data: PropTypes.shape({
      pocComplete: PropTypes.bool,
    }),
    event: PropTypes.shape({
      pocIds: PropTypes.arrayOf(PropTypes.number),
    }),
  }).isRequired,
};

const fields = Object.keys(nextStepsFields);
const path = 'next-steps';
const position = 3;

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
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
