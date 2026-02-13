import React from 'react'
import { TRAINING_REPORT_STATUSES } from '@ttahub/common'
import { useFormContext } from 'react-hook-form'
import { Button } from '@trussworks/react-uswds'
import { deleteSessionSupportingAttachment } from '../../../fetchers/File'
import { pageComplete, supportingAttachmentsVisitedField } from '../constants'
import SupportingAttachmentsSessionOrCommunication from '../../../components/SupportAttachmentsSessionOrCommunication'
import IndicatesRequiredField from '../../../components/IndicatesRequiredField'
import ReviewPage from '../../ActivityReport/Pages/Review/ReviewPage'
import { getAttachmentsSections } from '../../ActivityReport/Pages/supportingAttachments'

const path = 'supporting-attachments'
const position = 3
const fields = [supportingAttachmentsVisitedField]

const ReviewSection = () => {
  const { getValues } = useFormContext()

  const { supportingAttachments } = getValues()

  return (
    <ReviewPage
      className="smart-hub--supporting-attachments-review"
      sections={getAttachmentsSections(supportingAttachments)}
      path="supporting-attachments"
      isCustomValue
    />
  )
}

export const isPageComplete = (hookForm) => pageComplete(hookForm, fields)

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
    Alert
  ) => (
    <div className="padding-x-1">
      <IndicatesRequiredField />
      <SupportingAttachmentsSessionOrCommunication
        reportId={reportId}
        visitedFieldName={supportingAttachmentsVisitedField}
        handleDelete={deleteSessionSupportingAttachment}
        idKey="sessionAttachmentId"
        formName="supportingAttachments"
      />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>
          {additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE ? 'Save and continue' : 'Continue'}
        </Button>
        {
          // if status is 'Completed' then don't show the save draft button.
          additionalData && additionalData.status && additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE && (
            <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>
              Save draft
            </Button>
          )
        }
        <Button
          id={`${path}-back`}
          outline
          type="button"
          disabled={isAppLoading}
          onClick={() => {
            onUpdatePage(position - 1)
          }}
        >
          Back
        </Button>
      </div>
    </div>
  ),
  isPageComplete,
}
