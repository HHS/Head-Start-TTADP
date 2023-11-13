import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Helmet } from 'react-helmet';
import {
  ErrorMessage,
  Fieldset,
  FormGroup,
  Label,
  Button,
} from '@trussworks/react-uswds';
import ActivityReportFileUploader from '../../../../../components/FileUploader/ActivityReportFileUploader';
import { pageComplete, defaultLogValues } from '../constants';

const path = 'supporting-attachments';
const fields = Object.keys(defaultLogValues);
const position = 2;

const SupportingAttachments = () => {
  const [fileError, setFileError] = useState();

  return (
    <>
      <Helmet>
        <title>Supporting attachments</title>
      </Helmet>
      <Fieldset className="smart-hub--report-legend margin-top-4">
        <FormGroup error={fileError}>
          <div id="attachments" />
          <Label className="margin-top-0" htmlFor="files">
            Upload any relevant attachments, such as:
            <ul className="margin-top-0 padding-left-4">
              <li>meetings agendas</li>
              <li>services plans</li>
              <li>sign-in or attendance sheets</li>
              <li>other items not available online</li>
            </ul>
          </Label>

          <span className="usa-hint font-sans-3xs">Example: .doc, .pdf, .txt, .csv (max size 30 MB)</span>
          { fileError && (<ErrorMessage>{fileError}</ErrorMessage>)}
          <Controller
            name="files"
            defaultValue={[]}
            render={({ onChange, value }) => (
              <ActivityReportFileUploader setErrorMessage={setFileError} files={value} onChange={onChange} id="files" />
            )}
          />
        </FormGroup>
      </Fieldset>
    </>
  );
};

const ReviewSection = () => <></>;
export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

export default {
  position,
  label: 'Supporting attachments',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    _onSaveDraft,
    _onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <SupportingAttachments />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
