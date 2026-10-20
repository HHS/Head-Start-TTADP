import { Alert, Button, Dropdown, ErrorMessage, FormGroup, Label, Textarea } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { FormProvider, useForm } from 'react-hook-form';
import { Link, useHistory } from 'react-router-dom';
import Req from '../../../components/Req';
import { createFeedbackSurveyDefinition, getFeedbackSurveyDefinitions } from '../../../fetchers/Admin';
import useFetch from '../../../hooks/useFetch';
import SurveyDateFields from './components/SurveyDateFields';
import type { SurveyDateFormValues, SurveyDefinitionList } from './types';
import { apiErrorMessage, pageLabel, toSchedulePayload } from './utils';

interface CreateSurveyFormValues extends SurveyDateFormValues {
  pageId: string;
  question: string;
}

const MANAGE_PATH = '/admin/feedback-surveys/manage';

export default function CreateSurvey(): React.ReactElement {
  const history = useHistory();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, error: pagesError } = useFetch(
    { active: [], closed: [], pages: {} },
    getFeedbackSurveyDefinitions,
    [],
    'There was an error fetching survey pages.'
  );
  const { pages } = data as SurveyDefinitionList;

  const hookForm = useForm<CreateSurveyFormValues>({
    mode: 'onBlur',
    defaultValues: {
      pageId: '',
      manualClose: false,
      startDate: '',
      endDate: '',
      question: '',
    },
  });
  const { register, errors, handleSubmit } = hookForm;

  const onSubmit = async (values: CreateSurveyFormValues) => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await createFeedbackSurveyDefinition({
        pageId: values.pageId,
        question: values.question.trim(),
        ...toSchedulePayload(values),
      });
      history.push(MANAGE_PATH, { message: `Survey for ${pageLabel(pages, values.pageId)} created` });
    } catch (err) {
      setSubmitError(apiErrorMessage(err, 'There was an error creating the survey.'));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Create feedback survey</title>
      </Helmet>
      <h2 className="margin-y-2">Create new survey</h2>
      <FormProvider {...hookForm}>
        <form className="usa-form maxw-tablet" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormGroup error={!!errors.pageId}>
            <Label htmlFor="survey-page">
              Page <Req />
            </Label>
            {errors.pageId && <ErrorMessage>Select a page</ErrorMessage>}
            <Dropdown
              id="survey-page"
              name="pageId"
              inputRef={register({ required: true })}
              defaultValue=""
              required
            >
              <option value="" disabled hidden>
                Select
              </option>
              {Object.entries(pages).map(([pageId, label]) => (
                <option key={pageId} value={pageId}>
                  {label}
                </option>
              ))}
            </Dropdown>
            {pagesError && (
              <Alert type="error" slim headingLevel="h3" className="margin-top-1">
                {pagesError}
              </Alert>
            )}
          </FormGroup>

          <SurveyDateFields idPrefix="create" />

          <FormGroup error={!!errors.question} className="margin-top-3">
            <Label htmlFor="survey-question">
              Question <Req />
            </Label>
            <span className="usa-hint">Users answer with Yes or No and can add an optional comment.</span>
            {errors.question && <ErrorMessage>{errors.question.message}</ErrorMessage>}
            <Textarea
              id="survey-question"
              name="question"
              maxLength={500}
              inputRef={register({
                validate: (value: string) => value.trim() !== '' || 'Enter a question',
              })}
            />
          </FormGroup>

          {submitError && (
            <Alert type="error" slim headingLevel="h3" className="margin-top-3">
              {submitError}
            </Alert>
          )}

          <div className="margin-top-4">
            <Button type="submit" disabled={isSubmitting}>
              Create survey
            </Button>
            <Link to={MANAGE_PATH} className="usa-button usa-button--outline">
              Cancel
            </Link>
          </div>
        </form>
      </FormProvider>
    </>
  );
}
