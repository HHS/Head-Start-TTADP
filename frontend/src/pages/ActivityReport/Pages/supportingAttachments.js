import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { Helmet } from 'react-helmet';
import {
  ErrorMessage,
  Fieldset,
  FormGroup,
  Label,
} from '@trussworks/react-uswds';
import ReviewPage from './Review/ReviewPage';
import ActivityReportFileUploader from '../../../components/FileUploader/ActivityReportFileUploader';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import './supportingAttachments.scss';

const SupportingAttachments = ({
  reportId,
}) => {
  const [fileError, setFileError] = useState();

  return (
    <>
      <Helmet>
        <title>Supporting Attachments</title>
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
              <ActivityReportFileUploader setErrorMessage={setFileError} files={value} onChange={onChange} reportId={reportId} id="files" />
            )}
          />
        </FormGroup>
      </Fieldset>

    </>
  );
};

SupportingAttachments.propTypes = {
  reportId: PropTypes.node.isRequired,
};

const getAttachmentsSections = (files) => {
  const hasAttachments = files && files.length > 0;

  // Create HTML content that matches what the test expects
  const fileContents = hasAttachments
    ? files.map((file) => `<a href="${file.url.url}" target="_blank" rel="noopener noreferrer" class="file-name">${file.originalFileName}</a>`)
    : ['None provided'];

  return [
    {
      anchor: 'files',
      isEditSection: true,
      items: [
        {
          label: 'Attachments',
          name: 'attachmentFiles',
          // Use rich text to render HTML content
          isRichText: true,
          customValue: {
            // If there are attachments, use our custom HTML
            // If no attachments, show "None provided"
            attachmentFiles: hasAttachments
              ? `${fileContents.join(', ')}`
              : 'None provided',
          },
        },
      ],
    },
  ];
};

const ReviewSection = () => {
  const { watch } = useFormContext();
  const { files } = watch();

  return (
    <ReviewPage
      className="smart-hub--supporting-attachments-review"
      sections={getAttachmentsSections(files)}
      path="supporting-attachments"
      isCustomValue
    />
  );
};

export default {
  position: 3,
  label: 'Supporting attachments',
  path: 'supporting-attachments',
  reviewSection: () => <ReviewSection />,
  review: false,
  isPageComplete: () => true,
  render: (
    _additionalData,
    _formData,
    reportId,
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
      <SupportingAttachments
        reportId={reportId}
      />
      <Alert />
      <NavigatorButtons
        isAppLoading={isAppLoading}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        path="supporting-attachments"
        position={3}
      />
    </>
  ),
};
