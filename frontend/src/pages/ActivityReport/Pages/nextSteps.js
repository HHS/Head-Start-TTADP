import React from 'react'
import { Helmet } from 'react-helmet'
import { Fieldset } from '@trussworks/react-uswds'
import { useFormContext } from 'react-hook-form'
import NextStepsRepeater from './components/NextStepsRepeater'
import ReviewPage from './Review/ReviewPage'
import IndicatesRequiredField from '../../../components/IndicatesRequiredField'
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons'
import { isValidDate } from '../../../utils'

export const isPageComplete = (formData, formState) => {
  const { isValid } = formState
  if (isValid) {
    return true
  }

  const { specialistNextSteps, recipientNextSteps } = formData
  if (!specialistNextSteps || !recipientNextSteps) {
    return false
  }

  if (!specialistNextSteps.length || !recipientNextSteps.length) {
    return false
  }

  return [...specialistNextSteps, ...recipientNextSteps].every((step) => step.note && Boolean(isValidDate(step.completeDate)))
}

const NextSteps = () => {
  const { watch } = useFormContext()
  const activityRecipientType = watch('activityRecipientType')

  // Create labels.
  const labelDisplayName = activityRecipientType === 'other-entity' ? 'Other entities' : "Recipient's"

  return (
    <>
      <Helmet>
        <title>Next Steps</title>
      </Helmet>
      <IndicatesRequiredField />
      <Fieldset id="specialist-field-set" className="smart-hub--report-legend margin-top-4" legend="Specialist&apos;s next steps">
        <NextStepsRepeater id="specialist-next-steps-repeater-id" name="specialistNextSteps" ariaName="Specialist Next Steps" />
      </Fieldset>
      <Fieldset id="recipient-field-set" className="smart-hub--report-legend margin-top-3" legend={`${labelDisplayName} next steps`}>
        <NextStepsRepeater
          id="recipient-next-steps-repeater-id"
          name="recipientNextSteps"
          ariaName={`${labelDisplayName} next steps`}
          recipientType={activityRecipientType}
        />
      </Fieldset>
    </>
  )
}

NextSteps.propTypes = {}

NextSteps.defaultProps = {}

export const getNextStepsSections = (specialistNextSteps, recipientNextSteps) => {
  const specialistItems = (specialistNextSteps || []).map((step, index) => [
    {
      label: `Step ${index + 1}`,
      name: 'step',
      customValue: { step: step.note },
    },
    {
      label: 'Anticipated completion',
      name: 'date',
      customValue: { date: step.completeDate },
    },
  ])

  const recipientItems = (recipientNextSteps || []).map((step, index) => [
    {
      label: `Step ${index + 1}`,
      name: 'step',
      customValue: { step: step.note },
    },
    {
      label: 'Anticipated completion',
      name: 'date',
      customValue: { date: step.completeDate },
    },
  ])

  return [
    {
      title: "Specialist's next steps",
      isEditSection: true,
      anchor: 'specialist-next-steps',
      items: [...specialistItems.flatMap((item) => item)],
    },
    {
      title: "Recipient's next steps",
      anchor: 'recipient-next-steps',
      items: [...recipientItems.flatMap((item) => item)],
    },
  ]
}

const ReviewSection = () => {
  const { watch } = useFormContext()
  const { specialistNextSteps, recipientNextSteps } = watch()
  return <ReviewPage sections={getNextStepsSections(specialistNextSteps, recipientNextSteps)} path="next-steps" isCustomValue />
}

export default {
  position: 4,
  label: 'Next steps',
  path: 'next-steps',
  review: false,
  reviewSection: (activityRecipientType) => <ReviewSection activityRecipientType={activityRecipientType} />,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert
  ) => (
    <>
      <NextSteps />
      <Alert />
      <NavigatorButtons
        isAppLoading={isAppLoading}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        path="next-steps"
        position={4}
      />
    </>
  ),
  isPageComplete,
}
