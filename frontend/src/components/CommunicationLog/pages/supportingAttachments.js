import React from 'react';
import {
  Button,
  Label,
} from '@trussworks/react-uswds';
import { pageComplete } from '../constants';
import { deleteLogFile } from '../../../fetchers/File';
import SupportingAttachmentsSessionOrCommunication from '../../SupportAttachmentsSessionOrCommunication';
import IndicatesRequiredField from '../../IndicatesRequiredField';

const path = 'supporting-attachments';
const position = 2;
const visitedField = `pageVisited-${path}`;
const fields = [visitedField];

export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

export default {
  position,
  label: 'Supporting attachments',
  path,
  review: false,
  render: (
    _additionalData,
    _formData,
    reportId,
    isAppLoading,
    onContinue,
    _onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <>
      <IndicatesRequiredField />
      <div className="padding-x-1">
        <SupportingAttachmentsSessionOrCommunication
          reportId={reportId}
          visitedFieldName={visitedField}
          handleDelete={deleteLogFile}
          idKey="communicationLogId"
          formName="files"
        >
          <Label className="margin-top-0" htmlFor="files">
            Upload any relevant attachments.
          </Label>
        </SupportingAttachmentsSessionOrCommunication>
        <Alert />
        <div className="display-flex">
          <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
          <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
        </div>
      </div>
    </>
  ),
  isPageComplete,
};
