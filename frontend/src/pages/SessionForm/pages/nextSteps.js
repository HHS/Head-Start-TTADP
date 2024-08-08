import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Helmet } from 'react-helmet';
import {
  Button,
  Fieldset,
} from '@trussworks/react-uswds';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import {
  nextStepsFields,
} from '../constants';
import NextStepsRepeater from '../../ActivityReport/Pages/components/NextStepsRepeater';
import UserContext from '../../../UserContext';
import PocCompleteView from '../../../components/PocCompleteView';
import useTrainingReportRole from '../../../hooks/useTrainingReportRole';
import useTrainingReportTemplateDeterminator from '../../../hooks/useTrainingReportTemplateDeterminator';
import ReadOnlyField from '../../../components/ReadOnlyField';
import IncompletePages from '../../../components/IncompletePages';

const NextSteps = ({ formData }) => {
  const { user } = useContext(UserContext);
  const { isPoc } = useTrainingReportRole(formData.event, user.id);
  const showReadOnlyView = useTrainingReportTemplateDeterminator(formData, isPoc);

  if (showReadOnlyView) {
    return (
      <PocCompleteView formData={formData} userId={user.id}>
        <Helmet>
          <title>Next Steps</title>
        </Helmet>

        <h2>Specialist&apos;s next steps</h2>
        { formData.specialistNextSteps.map((step, index) => (
          <div key={`specialist-step${step.note}`}>
            <ReadOnlyField label={`Step ${index + 1}`}>
              {step.note}
            </ReadOnlyField>
            <ReadOnlyField label="Anticipated completion date">
              {step.completeDate}
            </ReadOnlyField>
          </div>
        ))}

        <h2>Recipient&apos;s next steps</h2>
        { formData.recipientNextSteps.map((step, index) => (
          <div key={`receipient-step${step.note}`}>
            <ReadOnlyField label={`Step ${index + 1}`}>
              {step.note}
            </ReadOnlyField>
            <ReadOnlyField label="Anticipated completion date">
              {step.completeDate}
            </ReadOnlyField>
          </div>
        ))}
      </PocCompleteView>
    );
  }

  return (
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
};

NextSteps.propTypes = {
  formData: PropTypes.shape({
    pocComplete: PropTypes.bool,
    pocCompleteId: PropTypes.number,
    pocCompleteDate: PropTypes.string,
    event: PropTypes.shape({
      pocIds: PropTypes.arrayOf(PropTypes.number),
    }),
    specialistNextSteps: PropTypes.arrayOf(PropTypes.shape({
      note: PropTypes.string,
      completeDate: PropTypes.string,
    })),
    recipientNextSteps: PropTypes.arrayOf(PropTypes.shape({
      note: PropTypes.string,
      completeDate: PropTypes.string,
    })),
  }).isRequired,
};

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
    additionalData,
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
      {additionalData
      && additionalData.incompletePages
      && additionalData.incompletePages.length > 0 && (
      <IncompletePages type="session" incompletePages={additionalData.incompletePages} />
      )}
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>Review and submit</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
