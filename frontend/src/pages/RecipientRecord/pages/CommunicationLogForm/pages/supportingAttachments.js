import React from 'react';
import {
  Button,
} from '@trussworks/react-uswds';
import { pageComplete } from '../constants';
import { deleteLogFile } from '../../../../../fetchers/File';
import SupportingAttachmentsSessionOrCommunication from '../../../../../components/SupportAttachmentsSessionOrCommunication';

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
    <div className="padding-x-1">
      <SupportingAttachmentsSessionOrCommunication
        reportId={reportId}
        visitedFieldName={visitedField}
        handleDelete={deleteLogFile}
        idKey="communicationLogId"
      />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
