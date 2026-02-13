import React from 'react'
import { Helmet } from 'react-helmet'
import { useFormContext } from 'react-hook-form'
import { Button, Fieldset } from '@trussworks/react-uswds'
import { pageComplete } from '../constants'
import IndicatesRequiredField from '../../IndicatesRequiredField'
import NextStepsRepeater from '../../../pages/ActivityReport/Pages/components/NextStepsRepeater'
import useCompleteSectionOnVisit from '../../../hooks/useCompleteSectionOnVisit'

const path = 'next-steps'
const visitedField = `pageVisited-${path}`
const fields = [visitedField]
const position = 3

const NextSteps = () => {
  const { register } = useFormContext()

  useCompleteSectionOnVisit(visitedField)

  return (
    <>
      <Helmet>
        <title>Next steps</title>
      </Helmet>
      <IndicatesRequiredField />
      <input type="hidden" ref={register()} name={visitedField} />
      <Fieldset id="specialist-field-set" className="smart-hub--report-legend margin-top-4" legend="Specialist&apos;s next steps">
        <NextStepsRepeater id="specialist-next-steps-repeater-id" name="specialistNextSteps" ariaName="Specialist Next Steps" required={false} />
      </Fieldset>
      <Fieldset id="recipient-field-set" className="smart-hub--report-legend margin-top-3" legend={"Recipient's next steps"}>
        <NextStepsRepeater
          id="recipient-next-steps-repeater-id"
          name="recipientNextSteps"
          ariaName={"Recipient's next steps"}
          recipientType="recipient"
          required={false}
        />
      </Fieldset>
    </>
  )
}

export const isPageComplete = (hookForm) => pageComplete(hookForm, fields)

export default {
  position,
  label: 'Next steps',
  path,
  review: false,
  fields,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    _onContinue,
    _onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    onFormSubmit,
    Alert
  ) => (
    <div className="padding-x-1">
      <NextSteps />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>
          Save log
        </Button>
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
