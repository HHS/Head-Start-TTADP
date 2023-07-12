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
import Section from './Review/ReviewSection';
import FileReviewItem from './Review/FileReviewItem';
import { reportIsEditable } from '../../../utils';
import ActivityReportFileUploader from '../../../components/FileUploader/ActivityReportFileUploader';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';

const SupportingAttachments = ({
  reportId,
}) => {
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

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    files,
    calculatedStatus,
  } = watch();

  const hasAttachments = files && files.length > 0;
  const canEdit = reportIsEditable(calculatedStatus);

  return (
    <>
      <Section
        hidePrint={!hasAttachments}
        key="Attachments"
        basePath="supporting-attachments"
        anchor="files"
        title="Attachments"
        canEdit={canEdit}
      >
        {files.map((file) => (
          <FileReviewItem
            key={file.url.url}
            filename={file.originalFileName}
            url={file.url.url}
            status={file.status}
          />
        ))}
      </Section>
    </>
  );
};

export default {
  position: 3,
  label: 'Supporting attachments',
  path: 'supporting-attachments',
  reviewSection: () => <ReviewSection />,
  review: false,
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
