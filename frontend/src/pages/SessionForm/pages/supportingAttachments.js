import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import {
  ErrorMessage,
  Fieldset,
  FormGroup,
  Label,
  Button,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Controller, useFormContext } from 'react-hook-form';
import ReportFileUploader from '../../../components/FileUploader/ReportFileUploader';
import { deleteSessionSupportingAttachment } from '../../../fetchers/File';
import { pageComplete } from '../constants';

const path = 'supporting-attachments';
const position = 3;
const visitedField = `pageVisited-${path}`;
const fields = [visitedField];

const SupportingAttachments = ({ reportId }) => {
  const [fileError, setFileError] = useState();
  const { watch, register, setValue } = useFormContext();
  const visitedRef = useRef(false);
  const pageVisited = watch(visitedField);

  useEffect(() => {
    /*
        Track if we have visited this page yet in order to mark page as 'complete'.
        We use a ref and a hook-form entry called 'visitedField' to track this requirement.
    */
    if (!pageVisited && !visitedRef.current) {
      visitedRef.current = true;
      setValue(visitedField, true);
    }
  }, [pageVisited, setValue]);

  return (
    <>
      <Helmet>
        <title>Supporting Attachments</title>
      </Helmet>
      <input type="hidden" ref={register()} name={visitedField} />
      <Fieldset className="smart-hub--report-legend margin-top-4">
        <FormGroup error={fileError}>
          <div id="attachments" />
          <Label className="margin-top-0" htmlFor="files">
            Upload any relevant attachments, such as:
            <ul className="margin-top-0 padding-left-4">
              <li>meetings agendas</li>
              <li>sign-in or attendance sheets</li>
              <li>other non-resource items not available online</li>
            </ul>
          </Label>

          <span className="usa-hint font-sans-3xs">Example: .doc, .pdf, .txt, .csv (max size 30 MB)</span>
          { fileError && (<ErrorMessage>{fileError}</ErrorMessage>)}
          <Controller
            name="supportingAttachments"
            defaultValue={[]}
            render={({ onChange, value }) => (
              <ReportFileUploader
                setErrorMessage={setFileError}
                files={value}
                onChange={onChange}
                id="supportingAttachments"
                idKey="sessionAttachmentId"
                idValue={reportId}
                deleteFile={deleteSessionSupportingAttachment}
              />
            )}
          />
        </FormGroup>
      </Fieldset>
    </>
  );
};

SupportingAttachments.propTypes = {
  reportId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
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
    additionalData,
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
    <div className="padding-x-1">
      <SupportingAttachments reportId={reportId} />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>{additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE ? 'Save and continue' : 'Continue' }</Button>
        {
          // if status is 'Completed' then don't show the save draft button.
          additionalData
          && additionalData.status
          && additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE && (
            <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
          )
        }
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
