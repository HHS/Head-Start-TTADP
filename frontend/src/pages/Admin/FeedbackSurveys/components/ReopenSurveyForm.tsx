import { Alert, Button, ModalFooter, ModalToggleButton } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { ModalRef } from '@trussworks/react-uswds';
import { reopenFeedbackSurveyDefinition } from '../../../../fetchers/Admin';
import type { SurveyDateFormValues, SurveyDefinition } from '../types';
import { apiErrorMessage, todayDisplayDate, toApiDate, toDisplayDate, toSchedulePayload } from '../utils';
import SurveyDateFields from './SurveyDateFields';

interface ReopenSurveyFormProps {
  survey: SurveyDefinition;
  modalRef: React.RefObject<ModalRef>;
  onReopened: (survey: SurveyDefinition) => void;
}

export default function ReopenSurveyForm({
  survey,
  modalRef,
  onReopened,
}: ReopenSurveyFormProps): React.ReactElement {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A closed survey's old window is usually in the past, so start from today when it is.
  // Surveys that were closed manually (no end date) default to manual close again.
  const today = todayDisplayDate();
  const wasManual = survey.endDate === null;
  const endIsPast = wasManual || survey.endDate < toApiDate(today);

  const hookForm = useForm<SurveyDateFormValues>({
    mode: 'onBlur',
    defaultValues: {
      manualClose: wasManual,
      startDate: endIsPast ? today : toDisplayDate(survey.startDate),
      endDate: endIsPast ? '' : toDisplayDate(survey.endDate),
    },
  });

  const onSubmit = async (values: SurveyDateFormValues) => {
    setError('');
    setIsSubmitting(true);
    try {
      const reopened = await reopenFeedbackSurveyDefinition(survey.id, toSchedulePayload(values));
      modalRef.current?.toggleModal(undefined, false);
      onReopened(reopened);
    } catch (err) {
      setError(apiErrorMessage(err, 'There was an error reopening the survey.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...hookForm}>
      <form className="usa-form maxw-full" onSubmit={hookForm.handleSubmit(onSubmit)} noValidate>
        <p className="margin-top-0">
          Choose the dates this survey should run, or close it manually, before reopening it.
        </p>
        <SurveyDateFields idPrefix={`reopen-${survey.id}`} />
        {error && (
          <Alert type="error" slim headingLevel="h4" className="margin-top-2">
            {error}
          </Alert>
        )}
        <ModalFooter>
          <Button type="submit" className="margin-right-1" disabled={isSubmitting}>
            Reopen survey
          </Button>
          <ModalToggleButton modalRef={modalRef} closer unstyled className="padding-105 text-center">
            Cancel
          </ModalToggleButton>
        </ModalFooter>
      </form>
    </FormProvider>
  );
}
