/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import SessionObjectiveResource from '../SessionObjectiveResource'

describe('SessionObjectiveResource', () => {
  const TestComponent = ({ index, fieldErrors, errors }) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {},
    })

    return (
      <FormProvider {...hookForm}>
        <SessionObjectiveResource
          errors={errors}
          fieldErrors={fieldErrors}
          resource={{ value: 'https://www.google.com' }}
          index={index}
          removeResource={jest.fn()}
          showRemoveButton
        />
      </FormProvider>
    )
  }

  const renderSessionObjectiveResource = (fieldErrors = null) => {
    const index = 0
    const errors = {}

    if (fieldErrors) {
      errors[`objectiveResources.${index}.value`] = fieldErrors
    }

    render(<TestComponent index={index} fieldErrors={fieldErrors} errors={errors} />)
  }

  it('shows an error message', () => {
    renderSessionObjectiveResource({ message: 'This is an error message' })
    expect(screen.getByText('This is an error message')).toBeInTheDocument()
  })
})
